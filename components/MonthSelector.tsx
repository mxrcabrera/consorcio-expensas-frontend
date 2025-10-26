'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { MONTHS } from '@/lib/utils';

interface MonthSelectorProps {
  selectedMonth: string;
  onSelect: (month: string) => void;
}

export default function MonthSelector({ selectedMonth, onSelect }: MonthSelectorProps) {
  return (
    <div className="config-section">
      <h3 className="config-label">Mes de Liquidación</h3>

      <div className="consorcio-card">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-mineral-taupe" />
          <label className="text-base font-semibold text-deep-stone">
            Seleccionar período
          </label>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-mineral-taupe/20 
                   focus:border-gold-vein focus:outline-none transition-colors
                   bg-white text-deep-stone font-medium"
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