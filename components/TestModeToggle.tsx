'use client';

import React from 'react';
import { Mail } from 'lucide-react';

interface TestModeToggleProps {
  testMode: boolean;
  testEmail: string;
  onToggle: (enabled: boolean) => void;
  onEmailChange: (email: string) => void;
}

export default function TestModeToggle({
  testMode,
  testEmail,
  onToggle,
  onEmailChange,
}: TestModeToggleProps) {
  return (
    <div className="config-section">
      <h3 className="config-label">Modo de Prueba</h3>

      <div className="consorcio-card">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => onToggle(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-mineral-taupe/30 text-gold-vein focus:ring-gold-vein"
          />
          <div className="flex-1">
            <label className="text-base font-semibold text-deep-stone cursor-pointer">
              Activar modo de prueba
            </label>
            <p className="text-sm text-mineral-taupe mt-1">
              Los correos se enviarán únicamente a la dirección especificada
            </p>
          </div>
        </div>

        {testMode && (
          <div className="mt-6 flex items-center gap-3">
            <Mail className="w-5 h-5 text-mineral-taupe" />
            <input
              type="email"
              value={testEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="correo@prueba.com"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-mineral-taupe/20 
                       focus:border-gold-vein focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
}