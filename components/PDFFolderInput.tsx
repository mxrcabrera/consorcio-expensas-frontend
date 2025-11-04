'use client';

import { FolderOpen } from 'lucide-react';

interface PDFFolderInputProps {
  folder: string;
  onChange: (folder: string) => void;
}

export default function PDFFolderInput({ folder, onChange }: PDFFolderInputProps) {
  return (
    <div className="config-section">
      <div className="config-label">Carpeta de PDFs</div>

      <div className="consorcio-card">
        <div className="form-label-group">
          <FolderOpen className="form-icon" />
          <label className="form-label">Ruta de carpeta con archivos PDF</label>
        </div>

        <input
          type="text"
          value={folder}
          onChange={(e) => onChange(e.target.value)}
          placeholder="C:/Expensas/PDFs"
          className="input-path"
        />
        <p className="form-hint">
          Debe contener: "Expensas [N].pdf" y "Detalle expensas [N].pdf"
        </p>
      </div>
    </div>
  );
}