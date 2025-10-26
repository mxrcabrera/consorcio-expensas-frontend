'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface CorteLuzConfigProps {
  diasCorte: number;
  onChange: (dias: number) => void;
}

export default function CorteLuzConfig({ diasCorte, onChange }: CorteLuzConfigProps) {
  return (
    <div className="config-section">
      <h3 className="config-label">Configuración del Corte</h3>

      <div className="consorcio-card">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-mineral-taupe" />
          <label className="text-base font-semibold text-deep-stone">
            Días hasta el corte programado
          </label>
        </div>

        <input
          type="number"
          min="1"
          max="30"
          value={diasCorte}
          onChange={(e) => onChange(parseInt(e.target.value) || 5)}
          className="w-full px-4 py-3 rounded-xl border-2 border-mineral-taupe/20 
                   focus:border-gold-vein focus:outline-none transition-colors"
        />
        <p className="text-xs text-mineral-taupe mt-2 italic">
          El sistema calculará la fecha automáticamente
        </p>
      </div>
    </div>
  );
}