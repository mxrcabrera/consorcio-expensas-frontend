'use client';

import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface SendingProgressProps {
  show: boolean;
  sent: number;
  total: number;
  errors: number;
  lines: string[];
}

export default function SendingProgress({
  show,
  sent,
  total,
  errors,
  lines = [],
}: SendingProgressProps) {
  if (!show) return null;

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [lines]);

  const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;
  const hasProgress = total > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-[80vh] flex flex-col">
        <div className="flex flex-col items-center gap-4 mb-4">
          <Loader2 className="w-12 h-12 text-gold-vein animate-spin" />
          
          <div className="text-center w-full">
            <h3 className="text-2xl font-serif font-semibold text-deep-stone mb-2">
              Enviando...
            </h3>
            <p className="text-sm text-mineral-taupe">
              Procesando notificaciones
            </p>
          </div>

          {hasProgress && (
            <>
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-mineral-taupe">
                    Progreso
                  </span>
                  <span className="text-sm font-bold text-gold-vein">
                    {sent} / {total}
                  </span>
                </div>
                <div className="progress-container h-3">
                  <div
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 w-full justify-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold">{sent} enviados</span>
                </div>
                {errors > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-semibold">{errors} errores</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Log de líneas en tiempo real */}
        <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg bg-gray-50">
          <div 
            ref={logContainerRef}
            className="h-full overflow-y-auto p-4 font-mono text-xs space-y-1"
            style={{ maxHeight: '400px' }}
          >
            {lines.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                Esperando salida de Python...
              </div>
            ) : (
              lines.map((line, i) => (
                <div
                  key={i}
                  className={`${
                    line.includes('✓') ? 'text-green-700' :
                    line.includes('✗') || line.includes('ERROR') ? 'text-red-700' :
                    line.includes('⊗') || line.includes('SALTEADO') ? 'text-yellow-700' :
                    line.includes('📋') || line.includes('📦') || line.includes('🔐') ? 'text-blue-700 font-semibold' :
                    line.includes('===') ? 'text-gray-500 font-bold' :
                    'text-gray-700'
                  }`}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}