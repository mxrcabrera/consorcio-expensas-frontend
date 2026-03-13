'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, History, CheckCircle, XCircle, TestTube, FileText, Zap, Bell } from 'lucide-react';

interface EnvioLog {
  id: string;
  edificio_id: string;
  tipo_accion: string;
  fecha: string;
  total_enviados: number;
  total_errores: number;
  modo_test: number;
}

interface EnviosHistorialProps {
  show: boolean;
  onClose: () => void;
  edificioId: string | null;
  edificioNombre: string;
}

const accionLabels: Record<string, { label: string; icon: typeof FileText }> = {
  expensas: { label: 'Expensas', icon: FileText },
  corte_luz: { label: 'Corte de Luz', icon: Zap },
  avisos_generales: { label: 'Avisos Generales', icon: Bell },
};

export default function EnviosHistorial({
  show,
  onClose,
  edificioId,
  edificioNombre,
}: EnviosHistorialProps) {
  const [logs, setLogs] = useState<EnvioLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!edificioId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/envios-log?edificioId=${edificioId}&limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  }, [edificioId]);

  useEffect(() => {
    if (show && edificioId) {
      loadLogs();
    }
  }, [show, edificioId, loadLogs]);

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '700px' }}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            <History className="w-5 h-5 text-gold-vein" />
            Historial de Envios
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-5 h-5 text-mineral-taupe" />
          </button>
        </div>

        <div className="historial-content">
          <p className="historial-subtitle">{edificioNombre}</p>

          {loading ? (
            <div className="historial-loading">Cargando historial...</div>
          ) : logs.length === 0 ? (
            <div className="historial-empty">
              <History className="w-12 h-12 text-mineral-taupe opacity-50" />
              <p>No hay envios registrados</p>
            </div>
          ) : (
            <div className="historial-list">
              {logs.map((log) => {
                const accion = accionLabels[log.tipo_accion] || {
                  label: log.tipo_accion,
                  icon: FileText,
                };
                const Icon = accion.icon;
                const hasErrors = log.total_errores > 0;
                const isTest = log.modo_test === 1;

                return (
                  <div key={log.id} className="historial-item">
                    <div className="historial-item-icon">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="historial-item-info">
                      <div className="historial-item-header">
                        <span className="historial-item-accion">{accion.label}</span>
                        {isTest && (
                          <span className="historial-badge test">
                            <TestTube className="w-3 h-3" />
                            Test
                          </span>
                        )}
                      </div>
                      <span className="historial-item-fecha">{formatFecha(log.fecha)}</span>
                    </div>
                    <div className="historial-item-stats">
                      <span className="historial-stat success">
                        <CheckCircle className="w-4 h-4" />
                        {log.total_enviados}
                      </span>
                      {hasErrors && (
                        <span className="historial-stat error">
                          <XCircle className="w-4 h-4" />
                          {log.total_errores}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
