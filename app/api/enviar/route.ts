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

          const args = [
            '-u',
            path.join(process.cwd(), 'python', 'expensas.py'),
            '--action', action,
            '--test-mode', testMode.toString(),
            '--test-email', testEmail,
            '--data-file', tempExcelPath,
            '--pdf-folder', pdfFolder,
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

          console.log('🐍 Ejecutando Python:', args.join(' '));

          const pythonProcess = spawn('python', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { 
              ...process.env, 
              PYTHONUNBUFFERED: '1',
              PYTHONIOENCODING: 'utf-8'
            }
          });

          let outputBuffer = '';
          let errorBuffer = '';

          // Leer stdout línea por línea
          const rl = createInterface({
            input: pythonProcess.stdout,
            crlfDelay: Infinity
          });

          rl.on('line', (line) => {
            outputBuffer += line + '\n';
            console.log('📤', line);
            
            // Enviar TODAS las líneas al frontend
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              line: line.trim() 
            })}\n\n`));
          });

          // Capturar errores
          pythonProcess.stderr.on('data', (data) => {
            const errorText = data.toString();
            errorBuffer += errorText;
            console.error('❌ Python stderr:', errorText);
            
            // Enviar errores también
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              line: errorText.trim() 
            })}\n\n`));
          });

          // Cuando termina el proceso
          pythonProcess.on('close', async (code) => {
            clearTimeout(timeoutId);
            console.log('🏁 Python terminó con código:', code);
            
            // Limpiar archivo temporal
            try {
              await fs.unlink(tempExcelPath);
            } catch (err) {
              console.warn('⚠️  No se pudo eliminar archivo temporal:', err);
            }

            if (code === 0) {
              // Buscar resumen (case-insensitive)
              const matchSent = outputBuffer.match(/enviados:\s*(\d+)/i);
              const matchErrors = outputBuffer.match(/errores:\s*(\d+)/i);
              const matchSalteados = outputBuffer.match(/salteados:\s*(\d+)/i);

              const sent = matchSent ? parseInt(matchSent[1]) : 0;
              const errors = matchErrors ? parseInt(matchErrors[1]) : 0;
              const salteados = matchSalteados ? parseInt(matchSalteados[1]) : 0;

              // Guardar log del envío
              if (buildingId) {
                try {
                  createEnvioLog({
                    edificio_id: buildingId,
                    tipo_accion: action,
                    total_enviados: sent,
                    total_errores: errors,
                    modo_test: testMode,
                  });
                  console.log('📝 Log de envío guardado');
                } catch (logErr) {
                  console.warn('⚠️  No se pudo guardar log de envío:', logErr);
                }
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: true,
                sent,
                errors,
                salteados,
                message: `✅ Completado: ${sent} enviados, ${errors} errores, ${salteados} salteados`
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
                  console.warn('⚠️  No se pudo guardar log de error:', logErr);
                }
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: false,
                message: errorBuffer || 'Error desconocido en Python'
              })}\n\n`));
            }

            controller.close();
          });

          // Timeout de seguridad (5 minutos)
          const timeoutId = setTimeout(() => {
            if (!pythonProcess.killed) {
              console.warn('⏰ Timeout: matando proceso Python');
              pythonProcess.kill();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: false,
                message: 'Timeout: El proceso tardó más de 5 minutos'
              })}\n\n`));
              controller.close();
            }
          }, 5 * 60 * 1000);

        } catch (error: any) {
          console.error('💥 Error en streaming:', error);
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