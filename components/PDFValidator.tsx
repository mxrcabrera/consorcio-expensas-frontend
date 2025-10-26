'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <div>
            <h3 className="text-2xl font-serif font-semibold text-deep-stone">
              Validación de PDFs
            </h3>
            <p className="text-sm text-mineral-taupe mt-1">
              {completos} completos • {incompletos} incompletos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 bg-stone-gray/20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold">{completos} completos</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-semibold">{incompletos} incompletos</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-mineral-taupe">Validando PDFs...</p>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {validation.map((item) => (
                <div
                  key={item.unidad}
                  className={`p-4 rounded-xl border-2 ${
                    item.completo
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.completo ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      )}
                      <span className="font-semibold text-deep-stone">
                        Unidad {item.unidad}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {item.expensas ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-xs font-mono">Expensas {item.unidad}.pdf</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.detalle ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-xs font-mono">Detalle expensas {item.unidad}.pdf</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}