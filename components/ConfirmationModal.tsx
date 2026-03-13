'use client';

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
    <div className="confirmation-modal-overlay">
      <div className="confirmation-modal-container">
        <div className="confirmation-modal-header">
          <div className="confirmation-modal-title-group">
            <AlertTriangle className="w-6 h-6 text-gold-vein" />
            <h3 className="confirmation-modal-title">Confirmar Envío</h3>
          </div>
          <button onClick={onCancel} className="template-toolbar-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="confirmation-modal-body">
          <div className="confirmation-summary">
            <p className="confirmation-summary-title">
              Estás por enviar:
            </p>
            <div className="confirmation-summary-list">
              <div className="confirmation-summary-item">
                <span className="confirmation-summary-label">Tipo de acción:</span>
                <span className="confirmation-summary-value">
                  {config.action === 'expensas' && 'Expensas'}
                  {config.action === 'corte_luz' && 'Corte de Luz'}
                  {config.action === 'avisos_generales' && 'Avisos Generales'}
                </span>
              </div>
              
              <div className="confirmation-summary-item">
                <span className="confirmation-summary-label">Modo:</span>
                <span className="confirmation-summary-value">
                  {config.testMode ? `Prueba (${config.testEmail})` : 'Producción'}
                </span>
              </div>
              
              {/* MODO TEST CON LIMITE: mostrar cantidad limitada */}
              {config.testMode && config.testEmailCount > 0 ? (
                <div className="confirmation-summary-item">
                  <span className="confirmation-summary-label">Emails a enviar:</span>
                  <span className="confirmation-summary-value-highlight">
                    {Math.min(config.testEmailCount, totalUnidades || totalEmails)} (prueba de formato)
                  </span>
                </div>
              ) : (
                <>
                  {/* MOSTRAR UFs Y PDFs POR SEPARADO PARA EXPENSAS */}
                  {config.action === 'expensas' && totalUnidades != null && totalUnidades > 0 && (
                    <>
                      <div className="confirmation-summary-item">
                        <span className="confirmation-summary-label">Unidades Funcionales:</span>
                        <span className="confirmation-summary-value">{totalUnidades}</span>
                      </div>
                      <div className="confirmation-summary-item">
                        <span className="confirmation-summary-label">Total PDFs:</span>
                        <span className="confirmation-summary-value-highlight">{totalEmails}</span>
                      </div>
                    </>
                  )}

                  {/* PARA OTROS TIPOS, SOLO MOSTRAR TOTAL EMAILS */}
                  {config.action !== 'expensas' && (
                    <div className="confirmation-summary-item">
                      <span className="confirmation-summary-label">Total emails:</span>
                      <span className="confirmation-summary-value-highlight">{totalEmails}</span>
                    </div>
                  )}
                </>
              )}
              
              {config.subject && (
                <div className="confirmation-summary-item">
                  <span className="confirmation-summary-label">Asunto:</span>
                  <span className="confirmation-summary-value-truncate">{config.subject}</span>
                </div>
              )}
            </div>
          </div>

          {!config.testMode && (
            <div className="confirmation-warning">
              <p className="confirmation-warning-text">
                ⚠️ MODO PRODUCCIÓN: Los emails se enviarán a los destinatarios reales.
              </p>
            </div>
          )}
        </div>

        <div className="confirmation-modal-footer">
          <button onClick={onCancel} className="btn-cancel-modal">
            Cancelar
          </button>
          <button onClick={onConfirm} className="btn-send-consorcio">
            Confirmar Envío
          </button>
        </div>
      </div>
    </div>
  );
}