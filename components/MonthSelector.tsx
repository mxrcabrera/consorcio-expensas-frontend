'use client';

import { Calendar } from 'lucide-react';
import { MONTHS } from '@/lib/utils';

interface MonthSelectorProps {
  selectedMonth: string;
  onSelect: (month: string) => void;
}

export default function MonthSelector({ selectedMonth, onSelect }: MonthSelectorProps) {
  return (
    <div className="config-section">
      <div className="config-label">Mes de Liquidación</div>

      <div className="consorcio-card">
        <div className="form-label-group">
          <Calendar className="form-icon" />
          <label className="form-label">Seleccionar período</label>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => onSelect(e.target.value)}
          className="select-input"
        >
          <option value="">-- Seleccionar mes --</option>
          {MONTHS.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}