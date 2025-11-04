import React from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onOpenExcel: () => void;
}

export default function Header({ onOpenExcel }: HeaderProps) {
  return (
    <header className="consorcio-header">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="consorcio-logo">
            <span className="logo-text">C</span>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-stone">
              Consorcio Expensas
            </h1>
            <p className="text-xs text-mineral-taupe mt-0.5">
              Sistema de Envío de Notificaciones
            </p>
          </div>
        </div>

        {/* Botón Gestionar Excel */}
        <button
          onClick={onOpenExcel}
          className="btn-secondary-consorcio"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Gestionar Excel
        </button>
      </div>
    </header>
  );
}