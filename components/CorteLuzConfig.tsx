'use client';

import { Calendar } from 'lucide-react';

interface CorteLuzConfigProps {
  diasCorte: number;
  onChange: (dias: number) => void;
}

export default function CorteLuzConfig({ diasCorte, onChange }: CorteLuzConfigProps) {
  return (
    <div className="config-section">
      <div className="config-label">Configuración del Corte</div>

      <div className="consorcio-card">
        <div className="form-label-group">
          <Calendar className="form-icon" />
          <label className="form-label">
            Días hasta el corte programado
          </label>
        </div>

        <input
          type="number"
          min="1"
          max="30"
          value={diasCorte}
          onChange={(e) => onChange(parseInt(e.target.value) || 5)}
          className="input-number"
        />
        
        <p className="form-hint">
          El sistema calculará la fecha automáticamente
        </p>
      </div>
    </div>
  );
}