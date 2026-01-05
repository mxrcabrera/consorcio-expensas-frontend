'use client';

import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, X } from 'lucide-react';

interface SendingProgressProps {
  show: boolean;
  sent: number;
  total: number;
  errors: number;
  lines: string[];
  onCancel: () => void;
}

export default function SendingProgress({
  show,
  sent,
  total,
  errors,
  lines = [],
  onCancel,
}: SendingProgressProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [lines]);

  if (!show) return null;

  const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;
  const hasProgress = total > 0;

  const getLineClass = (line: string) => {
    if (line.includes('✓')) return 'log-line-success';
    if (line.includes('✗') || line.includes('ERROR')) return 'log-line-error';
    if (line.includes('⊗') || line.includes('SALTEADO')) return 'log-line-warning';
    if (line.includes('📋') || line.includes('📦') || line.includes('🔐')) return 'log-line-info';
    if (line.includes('===')) return 'log-line-separator';
    return 'log-line-default';
  };

  return (
    <div className="sending-progress-overlay">
      <div className="sending-progress-container">
        <div className="sending-progress-header">
          <Loader2 className="sending-progress-spinner" />

          <div className="sending-progress-title-group">
            <h3 className="sending-progress-title">Enviando...</h3>
            <p className="sending-progress-subtitle">Procesando notificaciones</p>
          </div>

          {hasProgress && (
            <>
              <div className="sending-progress-bar-wrapper">
                <div className="sending-progress-bar-header">
                  <span className="sending-progress-bar-label">Progreso</span>
                  <span className="sending-progress-bar-value">
                    {sent} / {total}
                  </span>
                </div>
                <div className="progress-container" style={{ height: '0.75rem' }}>
                  <div className="progress-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>

              <div className="sending-progress-stats">
                <div className="sending-progress-stat">
                  <CheckCircle className="sending-progress-stat-icon-success" />
                  <span className="sending-progress-stat-label">{sent} enviados</span>
                </div>
                {errors > 0 && (
                  <div className="sending-progress-stat">
                    <XCircle className="sending-progress-stat-icon-error" />
                    <span className="sending-progress-stat-label">{errors} errores</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sending-progress-log">
          <div ref={logContainerRef} className="sending-progress-log-content">
            {lines.length === 0 ? (
              <div className="sending-progress-log-empty">
                Esperando salida de Python...
              </div>
            ) : (
              lines.map((line, i) => (
                <div key={i} className={`sending-progress-log-line ${getLineClass(line)}`}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sending-progress-footer">
          <button onClick={onCancel} className="btn-cancel-send">
            <X className="w-4 h-4" />
            Cancelar envío
          </button>
        </div>
      </div>
    </div>
  );
}
