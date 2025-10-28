'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Upload, FileSpreadsheet } from 'lucide-react';

interface ExcelDataViewerProps {
  show: boolean;
  file: File | null;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

// Función para detectar si una columna es de email
const isEmailColumn = (columnName: string): boolean => {
  const emailKeywords = ['email', 'mail', 'correo', 'e-mail', 'e_mail'];
  const normalized = columnName.toLowerCase().trim();
  return emailKeywords.some(keyword => normalized.includes(keyword));
};

// Función para detectar valores vacíos o que indican "sin dato"
const isEmpty = (val: any): boolean => {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const normalized = val.trim().toUpperCase();
    if (normalized === '') return true;
    // Detectar variaciones de "sin dato"
    const emptyIndicators = ['N/A', 'NA', 'N.A.', 'N.A', 'NONE', 'NULL', '-', '--', '---', 'SIN DATO', 'NO DISPONIBLE', 'NO APLICA'];
    return emptyIndicators.includes(normalized);
  }
  return false;
};

// Función para ordenar columnas: DEPTO primero, luego N, resto en orden original
const sortColumns = (columns: string[]): string[] => {
  const deptoCol = columns.find(col => 
    ['depto', 'dpto', 'departamento', 'unidad', 'uf'].includes(col.toLowerCase().trim())
  );
  const nCol = columns.find(col => 
    ['n', 'id', 'numero', '#', 'nro'].includes(col.toLowerCase().trim())
  );
  
  const result: string[] = [];
  
  // 1. Si existe DEPTO, va primero
  if (deptoCol) result.push(deptoCol);
  
  // 2. Si existe N/ID, va segundo
  if (nCol) result.push(nCol);
  
  // 3. El resto en orden original
  columns.forEach(col => {
    if (col !== deptoCol && col !== nCol) {
      result.push(col);
    }
  });
  
  return result;
};

export default function ExcelDataViewer({ show, file, onClose, onFileSelect }: ExcelDataViewerProps) {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [sortedColumns, setSortedColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show && file) {
      loadExcelData();
    }
  }, [show, file]);

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

  const loadExcelData = async () => {
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setFilteredData(result.data);
        
        // Ordenar columnas automáticamente
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
  };

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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
            <div>
              <h3 className="text-2xl font-serif font-semibold text-deep-stone">
                Datos Maestros
              </h3>
              <p className="text-sm text-mineral-taupe mt-1">
                Archivo Excel con destinatarios
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              onClick={handleUploadClick}
              className="border-2 border-dashed border-mineral-taupe/30 rounded-2xl p-12
                       hover:border-gold-vein/50 transition-colors cursor-pointer
                       flex flex-col items-center justify-center gap-4 text-center"
            >
              <Upload className="w-16 h-16 text-mineral-taupe" />
              <div>
                <p className="text-lg font-semibold text-deep-stone">
                  Arrastrá o hacé click para subir
                </p>
                <p className="text-sm text-mineral-taupe mt-2">
                  Este archivo se usará para todos los tipos de envío
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-mineral-taupe">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Cualquier formato de archivo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: Archivo cargado - mostrar datos
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <div>
            <h3 className="text-2xl font-serif font-semibold text-deep-stone">
              Datos Maestros
            </h3>
            <p className="text-sm text-mineral-taupe mt-1">
              {file.name} • {filteredData.length} registros
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUploadClick}
              className="px-4 py-2 rounded-lg border-2 border-mineral-taupe/20 hover:border-gold-vein hover:bg-gold-vein/5 transition-all text-sm font-medium"
            >
              Cambiar archivo
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-mineral-taupe/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-mineral-taupe" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-mineral-taupe/20 
                       focus:border-gold-vein focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-mineral-taupe">Cargando...</p>
            </div>
          ) : (
            <table className="datos-maestros-table">
              <thead>
                <tr>
                  {sortedColumns.map((key) => (
                    <th key={key}>
                      {key}
                    </th>
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