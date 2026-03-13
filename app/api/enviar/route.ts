import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import path from 'path';
import fs from 'fs/promises';
import { getEdificioById, createEnvioLog } from '@/lib/db';

const DATA_DIR = path.join(process.cwd(), 'data');

const PYTHON_CMD = process.platform === 'win32' ? 'py' : 'python3';

function safeEnqueue(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: object) {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  } catch {
    // Stream already closed
  }
}

function safeClose(controller: ReadableStreamDefaultController) {
  try {
    controller.close();
  } catch {
    // Stream already closed
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const formData = await request.formData();
          const action = formData.get('action') as string;
          const testMode = formData.get('testMode') === 'true';
          const testEmail = (formData.get('testEmail') as string) || '';
          const testEmailCount = parseInt(formData.get('testEmailCount') as string) || 0;
          const pdfFolder = (formData.get('pdfFolder') as string) || '';
          const diasCorte = (formData.get('diasCorte') as string) || '5';
          const subject = formData.get('subject') as string;
          const dataFile = formData.get('dataFile') as File;
          const buildingId = formData.get('buildingId') as string;

          let buildingConfig = null;
          if (buildingId) {
            const edificio = getEdificioById(buildingId);
            if (edificio) {
              buildingConfig = {
                id: edificio.id,
                nombre_remitente: edificio.nombre_remitente,
                email_remitente: edificio.email_remitente,
                ruta_base: edificio.ruta_base,
              };
            }
          }

          // Resolve Excel file: uploaded file or saved file per building
          let tempExcelPath: string;
          let shouldCleanTemp = false;

          const hasUploadedFile = dataFile && typeof dataFile !== 'string' && dataFile.size > 0;

          if (hasUploadedFile) {
            const tempDir = path.join(process.cwd(), 'temp');
            await fs.mkdir(tempDir, { recursive: true });
            tempExcelPath = path.join(tempDir, `data_${Date.now()}.xlsx`);
            const bytes = await dataFile.arrayBuffer();
            await fs.writeFile(tempExcelPath, Buffer.from(bytes));
            shouldCleanTemp = true;
          } else if (buildingId) {
            const savedPath = path.join(DATA_DIR, buildingId, 'datos_maestro.xlsx');
            try {
              await fs.access(savedPath);
              tempExcelPath = savedPath;
            } catch {
              safeEnqueue(controller, encoder, {
                type: 'complete',
                success: false,
                message: 'No hay archivo Excel cargado para este edificio'
              });
              safeClose(controller);
              return;
            }
          } else {
            safeEnqueue(controller, encoder, {
              type: 'complete',
              success: false,
              message: 'Faltan parametros: archivo Excel o edificio'
            });
            safeClose(controller);
            return;
          }

          let effectivePdfFolder = pdfFolder;
          if (buildingConfig?.ruta_base) {
            effectivePdfFolder = buildingConfig.ruta_base;
          }

          const args = [
            '-u',
            path.join(process.cwd(), 'python', 'expensas.py'),
            '--action', action,
            '--test-mode', testMode.toString(),
            '--test-email', testEmail,
            '--test-email-count', (testMode ? testEmailCount : 0).toString(),
            '--data-file', tempExcelPath,
            '--pdf-folder', effectivePdfFolder || '',
            '--plantillas-dir', path.join(process.cwd(), 'templates'),
            '--dias-corte', diasCorte,
            '--no-confirm',
          ];

          if (buildingConfig) {
            args.push('--building-config', JSON.stringify(buildingConfig));
          }

          if (subject) {
            args.push('--subject', subject);
          }

          console.log('[API] Ejecutando Python con args:', args);
          console.log('[API] CWD:', process.cwd());

          safeEnqueue(controller, encoder, {
            type: 'progress',
            line: 'Iniciando proceso de envio...'
          });

          const pythonProcess = spawn(PYTHON_CMD, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              PYTHONUNBUFFERED: '1',
              PYTHONIOENCODING: 'utf-8',
            }
          });

          safeEnqueue(controller, encoder, {
            type: 'progress',
            line: 'Python iniciado, esperando output...'
          });

          let outputBuffer = '';
          let errorBuffer = '';
          let closed = false;

          const closeStream = () => {
            if (closed) return;
            closed = true;
            safeClose(controller);
          };

          const rl = createInterface({
            input: pythonProcess.stdout,
            crlfDelay: Infinity
          });

          rl.on('line', (line) => {
            if (closed) return;
            outputBuffer += line + '\n';
            console.log('[PY]', line);
            safeEnqueue(controller, encoder, { type: 'progress', line: line.trim() });
          });

          pythonProcess.stderr.on('data', (data) => {
            if (closed) return;
            const errorText = data.toString();
            errorBuffer += errorText;
            console.error('[PY ERROR]', errorText);
            safeEnqueue(controller, encoder, {
              type: 'progress',
              line: `[ERROR] ${errorText.trim()}`
            });
          });

          pythonProcess.on('error', (err) => {
            console.error('[API ERROR] Error spawning Python:', err);
            safeEnqueue(controller, encoder, {
              type: 'complete',
              success: false,
              message: `Error ejecutando Python: ${err.message}`
            });
            closeStream();
          });

          const timeoutId = setTimeout(() => {
            if (!pythonProcess.killed) {
              console.warn('[API] Timeout: matando proceso Python');
              pythonProcess.kill();
              safeEnqueue(controller, encoder, {
                type: 'complete',
                success: false,
                message: 'Timeout: El proceso tardo mas de 5 minutos'
              });
              closeStream();
            }
          }, 5 * 60 * 1000);

          pythonProcess.on('close', (code) => {
            clearTimeout(timeoutId);
            console.log('[API] Python termino con codigo:', code);

            if (shouldCleanTemp) {
              fs.unlink(tempExcelPath).catch((err) => {
                console.warn('[API] No se pudo eliminar archivo temporal:', err);
              });
            }

            if (code === 0) {
              const matchSent = outputBuffer.match(/enviados:\s*(\d+)/i);
              const matchErrors = outputBuffer.match(/errores:\s*(\d+)/i);
              const matchSalteados = outputBuffer.match(/salteados:\s*(\d+)/i);

              const sent = matchSent ? parseInt(matchSent[1]) : 0;
              const errors = matchErrors ? parseInt(matchErrors[1]) : 0;
              const salteados = matchSalteados ? parseInt(matchSalteados[1]) : 0;

              if (buildingId) {
                try {
                  createEnvioLog({
                    edificio_id: buildingId,
                    tipo_accion: action,
                    total_enviados: sent,
                    total_errores: errors,
                    modo_test: testMode,
                  });
                } catch (logErr) {
                  console.warn('[API] No se pudo guardar log de envio:', logErr);
                }
              }

              safeEnqueue(controller, encoder, {
                type: 'complete',
                success: true,
                sent,
                errors,
                salteados,
                message: `Completado: ${sent} enviados, ${errors} errores, ${salteados} salteados`
              });
            } else {
              if (buildingId) {
                try {
                  createEnvioLog({
                    edificio_id: buildingId,
                    tipo_accion: action,
                    total_enviados: 0,
                    total_errores: 1,
                    modo_test: testMode,
                  });
                } catch (logErr) {
                  console.warn('[API] No se pudo guardar log de error:', logErr);
                }
              }

              const errorMessage = errorBuffer || outputBuffer || 'Error desconocido en Python';
              console.error('[API] Python fallo. stderr:', errorBuffer);
              console.error('[API] Python fallo. stdout:', outputBuffer);

              safeEnqueue(controller, encoder, {
                type: 'complete',
                success: false,
                message: errorMessage.substring(0, 500)
              });
            }

            closeStream();
          });

        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Error desconocido';
          console.error('[API ERROR] Error en streaming:', error);
          safeEnqueue(controller, encoder, {
            type: 'complete',
            success: false,
            message: `Error del servidor: ${message}`
          });
          safeClose(controller);
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
