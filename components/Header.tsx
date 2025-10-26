import React from 'react';

export default function Header() {
  return (
    <header className="consorcio-header">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-5">
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
    </header>
  );
}