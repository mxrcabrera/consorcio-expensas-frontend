import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import path from 'path';
import fs from 'fs/promises';

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

          if (!action || !dataFile) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Faltan parámetros' })}\n\n`));
            controller.close();
            return;
          }

          const tempDir = path.join(process.cwd(), 'temp');
          await fs.mkdir(tempDir, { recursive: true });
          const tempExcelPath = path.join(tempDir, `data_${Date.now()}.xlsx`);
          const bytes = await dataFile.arrayBuffer();
          await fs.writeFile(tempExcelPath, Buffer.from(bytes));

          const args = [
            '-u',
            path.join(process.cwd(), 'python', 'wrapper.py'),
            '--action', action,
            '--test-mode', testMode.toString(),
            '--test-email', testEmail,
            '--data-file', tempExcelPath,
            '--pdf-folder', pdfFolder,
            '--dias-corte', diasCorte,
            '--no-confirm',
          ];

          if (subject) {
            args.push('--subject', subject);
          }

          console.log('🐍 Ejecutando Python...');

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

          // PROCESAR LÍNEA POR LÍNEA EN TIEMPO REAL
          const rl = createInterface({
            input: pythonProcess.stdout,
            crlfDelay: Infinity
          });

          rl.on('line', (line) => {
            outputBuffer += line + '\n';
            console.log('📤', line);
            
            // Detectar envío de email INMEDIATAMENTE
            const esEnvioReal = line.includes('✓') && 
                                line.includes('  ✓') &&
                                (line.match(/\(.+@.+\)/) || line.includes('→'));
            
            if (esEnvioReal) {
              console.log('✅ Email detectado, enviando evento AHORA...');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                line: line.trim() 
              })}\n\n`));
            }
          });

          pythonProcess.stderr.on('data', (data) => {
            errorBuffer += data.toString();
            console.error('❌ Python error:', data.toString());
          });

          pythonProcess.on('close', async (code) => {
            console.log('🏁 Python terminó con código:', code);
            
            try {
              await fs.unlink(tempExcelPath);
            } catch {}

            if (code === 0) {
              const match = outputBuffer.match(/enviados:\s*(\d+)/i) || outputBuffer.match(/(\d+)\s+enviados/i);
              const errorsMatch = outputBuffer.match(/errores:\s*(\d+)/i) || outputBuffer.match(/(\d+)\s+errores/i);
              
              const sent = match ? parseInt(match[1]) : 0;
              const errors = errorsMatch ? parseInt(errorsMatch[1]) : 0;

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: true,
                sent,
                errors,
                message: `Envío completado: ${sent} emails enviados`
              })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                success: false,
                message: `Error: ${errorBuffer}`
              })}\n\n`));
            }

            controller.close();
          });

        } catch (error: any) {
          console.error('💥 Error en streaming:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            success: false,
            message: 'Error del servidor'
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