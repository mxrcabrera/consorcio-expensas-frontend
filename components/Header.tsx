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
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 border-2 text-sm font-medium"
          style={{
            borderColor: '#C9B28E',
            color: '#C9B28E',
            backgroundColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#C9B28E';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#C9B28E';
          }}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Gestionar Excel
        </button>
      </div>
    </header>
  );
}