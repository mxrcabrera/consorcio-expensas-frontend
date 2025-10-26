'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Code } from 'lucide-react';

interface TemplateEditorProps {
  show: boolean;
  onClose: () => void;
}

export default function TemplateEditor({ show, onClose }: TemplateEditorProps) {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (show) {
      loadTemplates();
    }
  }, [show]);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
      if (data.templates?.length > 0) {
        loadTemplate(data.templates[0]);
      }
    } catch (error) {
      console.error('Error cargando templates:', error);
    }
  };

  const loadTemplate = async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/templates?file=${filename}`);
      const data = await res.json();
      setContent(data.content || '');
      setSelectedTemplate(filename);
    } catch (error) {
      console.error('Error cargando template:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedTemplate, content }),
      });

      if (res.ok) {
        alert('Template guardado exitosamente');
      }
    } catch (error) {
      alert('Error guardando template');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <div>
            <h3 className="text-2xl font-serif font-semibold text-deep-stone">
              Editor de Plantillas
            </h3>
            <p className="text-sm text-mineral-taupe mt-1">
              Editar templates de emails HTML
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Selector de template */}
        <div className="px-6 py-4 border-b border-mineral-taupe/10 flex items-center gap-4">
          <select
            value={selectedTemplate}
            onChange={(e) => loadTemplate(e.target.value)}
            className="px-4 py-2 rounded-lg border-2 border-mineral-taupe/20 
                     focus:border-gold-vein focus:outline-none"
          >
            {templates.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-mineral-taupe/20
                     hover:border-gold-vein transition-colors"
          >
            {preview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? 'Código' : 'Vista Previa'}
          </button>

          <button
            onClick={saveTemplate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gold-vein text-white
                     hover:bg-gold-accent transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 overflow-auto p-6">
          {preview ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 border-2 border-mineral-taupe/20 rounded-lg
                       focus:border-gold-vein focus:outline-none font-mono text-sm"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}