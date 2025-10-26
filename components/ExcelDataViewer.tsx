'use client';

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

interface ExcelDataViewerProps {
  show: boolean;
  file: File | null;
  onClose: () => void;
}

export default function ExcelDataViewer({ show, file, onClose }: ExcelDataViewerProps) {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      }
    } catch (error) {
      console.error('Error cargando Excel:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <div>
            <h3 className="text-2xl font-serif font-semibold text-deep-stone">
              Datos del Excel
            </h3>
            <p className="text-sm text-mineral-taupe mt-1">
              {filteredData.length} registros
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
            <table className="w-full">
              <thead className="bg-stone-gray/30 sticky top-0">
                <tr>
                  {filteredData[0] &&
                    Object.keys(filteredData[0]).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-left text-xs font-semibold text-deep-stone uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-mineral-taupe/10">
                {filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-stone-gray/20">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="px-4 py-3 text-sm text-mineral-taupe">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}