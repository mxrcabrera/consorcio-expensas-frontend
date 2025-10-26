'use client';

import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface SendingProgressProps {
  show: boolean;
  sent: number;
  total: number;
  errors: number;
  currentEmail?: string;
}

export default function SendingProgress({
  show,
  sent,
  total,
  errors,
  currentEmail,
}: SendingProgressProps) {
  if (!show) return null;

  const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;
  const hasProgress = total > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8">
        <div className="flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 text-gold-vein animate-spin" />
          
          <div className="text-center w-full">
            <h3 className="text-2xl font-serif font-semibold text-deep-stone mb-2">
              Enviando...
            </h3>
            <p className="text-sm text-mineral-taupe">
              {currentEmail || 'Procesando notificaciones'}
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
      </div>
    </div>
  );
}