'use client';

import { Building2 } from 'lucide-react';
import { Edificio } from '@/types';

interface BuildingSelectorProps {
  edificios: Edificio[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onManage: () => void;
}

export default function BuildingSelector({
  edificios = [],
  selectedId,
  onSelect,
}: BuildingSelectorProps) {
  if (!edificios || edificios.length === 0) {
    return null;
  }

  // Si hay 1 solo edificio, mostrar solo el nombre (sin dropdown)
  if (edificios.length === 1) {
    return (
      <div className="building-selector">
        <Building2 className="w-4 h-4 text-gold-vein" />
        <span className="building-name">{edificios[0].nombre}</span>
      </div>
    );
  }

  // Si hay más de 1, mostrar dropdown
  return (
    <div className="building-selector">
      <Building2 className="w-4 h-4 text-gold-vein" />
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="building-select"
      >
        {edificios.map((edificio) => (
          <option key={edificio.id} value={edificio.id}>
            {edificio.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
