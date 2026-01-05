import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import path from 'path';
import fs from 'fs/promises';
import { getEdificioById, createEnvioLog } from '@/lib/db';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const formData = await request.formData();
          const action = formData.get('action') as string;
          const testMode = formData.get('testMode') === 'true';
          const testEmail = formData.get('testEmail') as string;
          const testEmailCount = parseInt(formData.get('testEmailCount') as string) || 0;
          const pdfFolder = formData.get('pdfFolder') as string;
          const diasCorte = formData.get('diasCorte') as string;
          const subject = formData.get('subject') as string;
          const dataFile = formData.get('dataFile') as File;
          const buildingId = formData.get('buildingId') as string;

          if (!action || !dataFile) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: 'Faltan parámetros'
            })}\n\n`));
            controller.close();
            return;
          }

          // Obtener config del edificio
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

          const tempDir = path.join(process.cwd(), 'temp');
          await fs.mkdir(tempDir, { recursive: true });
          const tempExcelPath = path.join(tempDir, `data_${Date.now()}.xlsx`);
          const bytes = await dataFile.arrayBuffer();
          await fs.writeFile(tempExcelPath, Buffer.from(bytes));

          // Determinar carpeta de PDFs: usar ruta_base del edificio directamente (los PDFs estan ahi)
          let effectivePdfFolder = pdfFolder;
          if (buildingConfig && buildingConfig.ruta_base) {
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

          // Pasar config del edificio como JSON
          if (buildingConfig) {
            args.push('--building-config', JSON.stringify(buildingConfig));
          }

          if (subject) {
            args.push('--subject', subject);
          }

          console.log('[API] Ejecutando Python con args:', args);
          console.log('[API] CWD:', process.cwd());

          // Enviar evento inicial para confirmar que el stream funciona
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            line: 'Iniciando proceso de envio...'
          })}\n\n`));

          const pythonProcess = spawn('python', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              PYTHONUNBUFFERED: '1'
            }
          });

          // Confirmar que Python se inicio
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            line: 'Python iniciado, esperando output...'
          })}\n\n`));

          let outputBuffer = '';
          let errorBuffer = '';

          // Leer stdout línea por línea
          const rl = createInterface({
            input: pythonProcess.stdout,
            crlfDelay: Infinity
          });

          rl.on('line', (line) => {
            outputBuffer += line + '\n';
            console.log('[PY]', line);

            // Enviar TODAS las lineas al frontend
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              line: line.trim()
            })}\n\n`));
          });

          // Capturar errores
          pythonProcess.stderr.on('data', (data) => {
            const errorText = data.toString();
            errorBuffer += errorText;
            console.error('[PY ERROR]', errorText);

            // Enviar errores tambien
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              line: `[ERROR] ${errorText.trim()}`
            })}\n\n`));
          });

          // Handler para errores de spawn
          pythonProcess.on('error', (err) => {
            console.error('[API ERROR] Error spawning Python:', err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              success: false,
              message: `Error ejecutando Python: ${err.message}`
            })}\n\n`));
            controller.close();
          });

          // Timeout de seguridad (5 minutos) - DEBE estar antes de on('close')
          const timeoutId = setTimeout(() => {
            if (!pythonProcess.killed) {
              console.warn('[API] Timeout: matando proceso Python');
              pythonProcess.kill();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: false,
                message: 'Timeout: El proceso tardo mas de 5 minutos'
              })}\n\n`));
              controller.close();
            }
          }, 5 * 60 * 1000);

          // Cuando termina el proceso
          pythonProcess.on('close', async (code) => {
            clearTimeout(timeoutId);
            console.log('[API] Python termino con codigo:', code);

            // Limpiar archivo temporal
            try {
              await fs.unlink(tempExcelPath);
            } catch (err) {
              console.warn('[API] No se pudo eliminar archivo temporal:', err);
            }

            if (code === 0) {
              // Buscar resumen (case-insensitive)
              const matchSent = outputBuffer.match(/enviados:\s*(\d+)/i);
              const matchErrors = outputBuffer.match(/errores:\s*(\d+)/i);
              const matchSalteados = outputBuffer.match(/salteados:\s*(\d+)/i);

              const sent = matchSent ? parseInt(matchSent[1]) : 0;
              const errors = matchErrors ? parseInt(matchErrors[1]) : 0;
              const salteados = matchSalteados ? parseInt(matchSalteados[1]) : 0;

              // Guardar log del envio
              if (buildingId) {
                try {
                  createEnvioLog({
                    edificio_id: buildingId,
                    tipo_accion: action,
                    total_enviados: sent,
                    total_errores: errors,
                    modo_test: testMode,
                  });
                  console.log('[API] Log de envio guardado');
                } catch (logErr) {
                  console.warn('[API] No se pudo guardar log de envio:', logErr);
                }
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: true,
                sent,
                errors,
                salteados,
                message: `Completado: ${sent} enviados, ${errors} errores, ${salteados} salteados`
              })}\n\n`));
            } else {
              // Guardar log de error
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

              // Incluir tanto stderr como stdout para debug
              const errorMessage = errorBuffer || outputBuffer || 'Error desconocido en Python';
              console.error('[API] Python fallo. stderr:', errorBuffer);
              console.error('[API] Python fallo. stdout:', outputBuffer);

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: false,
                message: errorMessage.substring(0, 500) // Limitar longitud
              })}\n\n`));
            }

            controller.close();
          });

        } catch (error: any) {
          console.error('[API ERROR] Error en streaming:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            success: false,
            message: `Error del servidor: ${error.message}`
          })}\n\n`));
          controller.close();
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