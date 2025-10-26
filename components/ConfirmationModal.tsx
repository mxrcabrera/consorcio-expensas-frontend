'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ConfigState } from '@/types';

interface ConfirmationModalProps {
  show: boolean;
  config: ConfigState;
  totalEmails: number;
  totalUnidades?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  show,
  config,
  totalEmails,
  totalUnidades,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-gold-vein" />
            <h3 className="text-xl font-serif font-semibold">Confirmar Envío</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-stone-gray/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-deep-stone mb-3">
              Estás por enviar:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-mineral-taupe">Tipo de acción:</span>
                <span className="font-semibold">
                  {config.action === 'expensas' && 'Expensas'}
                  {config.action === 'corte_luz' && 'Corte de Luz'}
                  {config.action === 'avisos_generales' && 'Avisos Generales'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-mineral-taupe">Modo:</span>
                <span className="font-semibold">
                  {config.testMode ? `Prueba (${config.testEmail})` : 'Producción'}
                </span>
              </li>
              
              {/* MOSTRAR UFs Y PDFs POR SEPARADO PARA EXPENSAS */}
              {config.action === 'expensas' && totalUnidades && (
                <>
                  <li className="flex justify-between">
                    <span className="text-mineral-taupe">Unidades Funcionales:</span>
                    <span className="font-semibold">{totalUnidades}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-mineral-taupe">Total PDFs:</span>
                    <span className="font-semibold text-gold-vein">{totalEmails}</span>
                  </li>
                </>
              )}
              
              {/* PARA OTROS TIPOS, SOLO MOSTRAR TOTAL EMAILS */}
              {config.action !== 'expensas' && (
                <li className="flex justify-between">
                  <span className="text-mineral-taupe">Total emails:</span>
                  <span className="font-semibold text-gold-vein">{totalEmails}</span>
                </li>
              )}
              
              {config.subject && (
                <li className="flex justify-between">
                  <span className="text-mineral-taupe">Asunto:</span>
                  <span className="font-semibold truncate ml-2">{config.subject}</span>
                </li>
              )}
            </ul>
          </div>

          {!config.testMode && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 font-semibold">
                ⚠️ MODO PRODUCCIÓN: Los emails se enviarán a los destinatarios reales.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-mineral-taupe/10">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl border-2 border-mineral-taupe/20
                     hover:bg-stone-gray transition-colors font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn-send-consorcio"
          >
            Confirmar Envío
          </button>
        </div>
      </div>
    </div>
  );
}