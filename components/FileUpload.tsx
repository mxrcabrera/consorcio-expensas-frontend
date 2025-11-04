'use client';

import React, { useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

export default function FileUpload({ file, onFileSelect }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileSelect(selectedFile);
  };

  return (
    <div className="config-section">
      <h3 className="config-label">Archivo de Datos</h3>

      <div className="consorcio-card">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onClick={handleClick}
          className="border-2 border-dashed border-mineral-taupe/30 rounded-2xl p-8
                   hover:border-gold-vein/50 transition-colors cursor-pointer
                   flex flex-col items-center justify-center gap-4 text-center"
        >
          {file ? (
            <>
              <CheckCircle className="w-12 h-12 text-gold-vein" />
              <div>
                <p className="text-base font-semibold text-deep-stone">
                  {file.name}
                </p>
                <p className="text-sm text-mineral-taupe mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect(null);
                }}
                className="btn-text-consorcio"
              >
                Cambiar archivo
              </button>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-mineral-taupe" />
              <div>
                <p className="text-base font-semibold text-deep-stone">
                  Arrastrá o hacé click para subir
                </p>
                <p className="text-sm text-mineral-taupe mt-1">
                  Excel o CSV con datos de propietarios
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-mineral-taupe">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Formatos: .xlsx, .xls, .csv</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}