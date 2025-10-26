'use client';

import React, { useState } from 'react';
import { Eye, X } from 'lucide-react';

interface TemplatePreviewProps {
  actionType: 'expensas' | 'corte_luz' | 'avisos_generales';
}

export default function TemplatePreview({ actionType }: TemplatePreviewProps) {
  const [showModal, setShowModal] = useState(false);

  const templates = {
    expensas: 'expensas.html',
    corte_luz: 'corte_luz.html',
    avisos_generales: 'aviso_general.html',
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-mineral-taupe/20
                 hover:border-gold-vein hover:bg-gold-vein/5 transition-all text-sm font-medium"
      >
        <Eye className="w-4 h-4" />
        Ver plantilla
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
              <h3 className="text-xl font-serif font-semibold">
                Plantilla: {templates[actionType]}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-auto">
              <p className="text-sm text-mineral-taupe mb-4">
                📁 Ubicación: <code className="bg-stone-gray px-2 py-1 rounded">C:/Expensas/Plantillas/{templates[actionType]}</code>
              </p>
              <p className="text-sm text-mineral-taupe">
                Para editar esta plantilla, modificá el archivo HTML directamente en la carpeta de plantillas.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}