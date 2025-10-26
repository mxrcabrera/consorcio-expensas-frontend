'use client';

import React from 'react';
import { FolderOpen } from 'lucide-react';

interface PDFFolderInputProps {
  folder: string;
  onChange: (folder: string) => void;
}

export default function PDFFolderInput({ folder, onChange }: PDFFolderInputProps) {
  return (
    <div className="config-section">
      <h3 className="config-label">Carpeta de PDFs</h3>

      <div className="consorcio-card">
        <div className="flex items-center gap-3 mb-4">
          <FolderOpen className="w-5 h-5 text-mineral-taupe" />
          <label className="text-base font-semibold text-deep-stone">
            Ruta de carpeta con archivos PDF
          </label>
        </div>

        <input
          type="text"
          value={folder}
          onChange={(e) => onChange(e.target.value)}
          placeholder="C:/Expensas/PDFs"
          className="w-full px-4 py-3 rounded-xl border-2 border-mineral-taupe/20 
                   focus:border-gold-vein focus:outline-none transition-colors
                   font-mono text-sm"
        />
        <p className="text-xs text-mineral-taupe mt-2 italic">
          Debe contener: "Expensas [N].pdf" y "Detalle expensas [N].pdf"
        </p>
      </div>
    </div>
  );
}