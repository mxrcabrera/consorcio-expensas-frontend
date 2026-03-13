'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Upload, FileSpreadsheet } from 'lucide-react';

interface ExcelDataViewerProps {
  show: boolean;
  file: File | null;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

const isEmpty = (val: unknown): boolean => {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const normalized = val.trim().toUpperCase();
    if (normalized === '') return true;
    const emptyIndicators = ['N/A', 'NA', 'N.A.', 'N.A', 'NONE', 'NULL', '-', '--', '---', 'SIN DATO', 'NO DISPONIBLE', 'NO APLICA'];
    return emptyIndicators.includes(normalized);
  }
  return false;
};

const sortColumns = (columns: string[]): string[] => {
  const deptoCol = columns.find(col => 
    ['depto', 'dpto', 'departamento', 'unidad', 'uf'].includes(col.toLowerCase().trim())
  );
  const nCol = columns.find(col => 
    ['n', 'id', 'numero', '#', 'nro'].includes(col.toLowerCase().trim())
  );
  
  const result: string[] = [];
  if (deptoCol) result.push(deptoCol);
  if (nCol) result.push(nCol);
  columns.forEach(col => {
    if (col !== deptoCol && col !== nCol) {
      result.push(col);
    }
  });
  
  return result;
};

export default function ExcelDataViewer({ show, file, onClose, onFileSelect }: ExcelDataViewerProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [filteredData, setFilteredData] = useState<Record<string, unknown>[]>([]);
  const [sortedColumns, setSortedColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const loadExcelData = useCallback(async () => {
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/excel', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setFilteredData(result.data);

        if (result.data.length > 0) {
          const columns = Object.keys(result.data[0]);
          const sorted = sortColumns(columns);
          setSortedColumns(sorted);
        }
      }
    } catch (error) {
      console.error('Error cargando Excel:', error);
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (show && file) {
      loadExcelData();
    }
  }, [show, file, loadExcelData]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchTerm, data]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  if (!show) return null;

  // VISTA: No hay archivo cargado
  if (!file) {
    return (
      <div className="excel-modal-overlay">
        <div className="excel-modal-container" style={{ maxWidth: '42rem' }}>
          <div className="excel-modal-header">
            <div>
              <h3 className="excel-modal-title">Datos Maestros</h3>
              <p className="excel-modal-subtitle">Archivo Excel con destinatarios</p>
            </div>
            <button onClick={onClose} className="template-toolbar-btn">
              <X className="w-6 h-6" />
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          <div onClick={handleUploadClick} className="excel-dropzone">
            <div className="excel-dropzone-icon">
              <Upload className="w-8 h-8" />
            </div>
            
            <h4 className="excel-dropzone-title">
              Arrastrá o hacé click para subir
            </h4>
            
            <p className="excel-dropzone-subtitle">
              Este archivo se usará para todos los tipos de envío
            </p>
            
            <div className="excel-dropzone-hint">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Cualquier formato de archivo</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: Archivo cargado - mostrar datos
  return (
    <div className="excel-modal-overlay">
      <div className="excel-modal-container">
        <div className="excel-modal-header">
          <div>
            <h3 className="excel-modal-title">Datos Maestros</h3>
            <p className="excel-modal-subtitle">
              {file.name} • {filteredData.length} registros
            </p>
          </div>
          <div className="excel-modal-header-actions">
            <button onClick={handleUploadClick} className="btn-secondary-consorcio">
              Cambiar archivo
            </button>
            <button onClick={onClose} className="template-toolbar-btn">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search className="search-input-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="search-input"
            />
          </div>
        </div>

        <div className="excel-table-wrapper">
          {loading ? (
            <div className="loading-state">
              <p className="loading-text">Cargando...</p>
            </div>
          ) : (
            <table className="datos-maestros-table">
              <thead>
                <tr>
                  {sortedColumns.map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i}>
                    {sortedColumns.map((key, j) => {
                      const val = row[key];
                      const cellIsEmpty = isEmpty(val);
                      
                      return (
                        <td 
                          key={j} 
                          className={cellIsEmpty ? 'empty-cell' : ''}
                          title={cellIsEmpty ? 'Sin datos' : String(val)}
                        >
                          {cellIsEmpty ? 'N/A' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}