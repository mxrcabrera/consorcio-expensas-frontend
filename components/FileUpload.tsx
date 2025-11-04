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
      <div className="config-label">Archivo de Datos</div>

      <div className="consorcio-card">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <div className="pdf-loaded">
            <div className="pdf-loaded-icon">
              <CheckCircle className="file-upload-icon-success" />
            </div>
            <p className="file-upload-filename">{file.name}</p>
            <p className="file-upload-filesize">
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(null);
              }}
              className="btn-text-consorcio"
            >
              Cambiar archivo
            </button>
          </div>
        ) : (
          <div onClick={handleClick} className="pdf-dropzone">
            <div className="pdf-dropzone-icon">
              <Upload className="w-8 h-8" />
            </div>
            
            <h4 className="pdf-dropzone-title">
              Arrastrá o hacé click para subir
            </h4>
            
            <p className="pdf-dropzone-subtitle">
              Excel o CSV con datos de propietarios
            </p>
            
            <div className="file-upload-format-hint">
              <FileSpreadsheet className="file-upload-icon-small" />
              <span>Formatos: .xlsx, .xls, .csv</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}