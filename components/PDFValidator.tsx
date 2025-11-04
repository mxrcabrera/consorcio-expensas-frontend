'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from './Badge';

interface PDFValidatorProps {
  show: boolean;
  pdfFolder: string;
  unidades: string[];
  onClose: () => void;
}

interface PDFStatus {
  unidad: string;
  expensas: boolean;
  detalle: boolean;
  completo: boolean;
}

export default function PDFValidator({ show, pdfFolder, unidades, onClose }: PDFValidatorProps) {
  const [validation, setValidation] = useState<PDFStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && pdfFolder && unidades.length > 0) {
      validatePDFs();
    }
  }, [show, pdfFolder, unidades]);

  const validatePDFs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/validate-pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfFolder, unidades }),
      });

      const data = await res.json();
      setValidation(data.validation || []);
    } catch (error) {
      console.error('Error validando PDFs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const completos = validation.filter((v) => v.completo).length;
  const incompletos = validation.length - completos;

  return (
    <div className="excel-modal-overlay">
      <div className="excel-modal-container">
        <div className="excel-modal-header">
          <div>
            <h3 className="excel-modal-title">Validación de PDFs</h3>
            <p className="excel-modal-subtitle">
              {completos} completos • {incompletos} incompletos
            </p>
          </div>
          <button onClick={onClose} className="template-toolbar-btn">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="pdf-validator-summary">
          <Badge variant="success">✓ {completos} completos</Badge>
          <Badge variant="error">✗ {incompletos} incompletos</Badge>
        </div>

        <div className="pdf-validator-list">
          {loading ? (
            <div className="loading-state">
              <p className="loading-text">Validando PDFs...</p>
            </div>
          ) : (
            validation.map((item) => (
              <div
                key={item.unidad}
                className={`pdf-validator-item ${
                  item.completo ? 'pdf-validator-item-success' : 'pdf-validator-item-error'
                }`}
              >
                <div className="pdf-validator-item-header">
                  <div className="pdf-validator-item-title">
                    {item.completo ? (
                      <CheckCircle className="pdf-validator-icon-success" />
                    ) : (
                      <AlertTriangle className="pdf-validator-icon-error" />
                    )}
                    <span className="pdf-validator-unit-label">
                      Unidad {item.unidad}
                    </span>
                  </div>
                  <div className="pdf-validator-item-badges">
                    <Badge variant={item.expensas ? 'success' : 'error'}>
                      {item.expensas ? '✓' : '✗'} Expensas {item.unidad}.pdf
                    </Badge>
                    <Badge variant={item.detalle ? 'success' : 'error'}>
                      {item.detalle ? '✓' : '✗'} Detalle {item.unidad}.pdf
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}