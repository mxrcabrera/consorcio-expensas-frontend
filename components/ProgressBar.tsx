import React from 'react';

interface ProgressBarProps {
  percentage: number;
}

export default function ProgressBar({ percentage }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-mineral-taupe uppercase tracking-wider">
          Progreso de Configuración
        </span>
        <span className="text-sm font-bold text-gold-vein">
          {percentage}%
        </span>
      </div>
      <div className="progress-container">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}