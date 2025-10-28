'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { ActionType } from '@/types';
import Toast from './Toast';

interface TemplateEditorProps {
  show: boolean;
  onClose: () => void;
  currentAction?: ActionType | null;
}

const COLORS = [
  ['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
  ['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
  ['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
  ['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
  ['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
  ['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
  ['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47'],
  ['#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130']
];

const FONTS = [
  'Arial',
  'Trebuchet MS',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Comic Sans MS',
  'Impact'
];

// Ícono personalizado estilo Gmail
const TextColorIcon = () => (
  <div className="relative w-5 h-5 flex items-center justify-center">
    <span className="font-bold text-sm" style={{ color: '#000' }}>A</span>
    <div className="absolute bottom-0 left-0 right-0 h-1 flex">
      <div className="flex-1" style={{ backgroundColor: '#000' }} />
    </div>
  </div>
);

const BgColorIcon = () => (
  <div className="relative w-5 h-5 flex items-center justify-center">
    <span className="font-bold text-sm" style={{ color: '#000' }}>A</span>
    <div className="absolute inset-0 -z-10 opacity-30" style={{ backgroundColor: '#ffeb3b' }} />
  </div>
);

export default function TemplateEditor({ show, onClose, currentAction }: TemplateEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [firmaHtml, setFirmaHtml] = useState<string>('');
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const editorRef = useRef<HTMLDivElement>(null);

  const getTemplateForAction = (action: ActionType | null | undefined) => {
    if (!action) return 'expensas.html';
    if (action === 'expensas') return 'expensas.html';
    if (action === 'corte_luz') return 'corte_luz.html';
    if (action === 'avisos_generales') return 'aviso_general.html';
    return 'expensas.html';
  };

  useEffect(() => {
    if (show) {
      const templateFile = getTemplateForAction(currentAction);
      loadTemplate(templateFile);
      loadFirma();
    }
  }, [show, currentAction]);

  const loadFirma = async () => {
    try {
      const res = await fetch('/api/templates?file=firma.html');
      const data = await res.json();
      setFirmaHtml(data.content || '');
    } catch (error) {
      console.error('Error cargando firma:', error);
    }
  };

  useEffect(() => {
    if (show) {
      setToast({ show: false, message: '', type: 'success' });
    }
  }, [show]);

  const loadTemplate = async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/templates?file=${filename}`);
      const data = await res.json();
      
      if (editorRef.current && data.content) {
        // Parsear HTML completo
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.content, 'text/html');
        
        // Extraer SOLO el innerHTML del body (mantiene todos los estilos inline)
        const bodyContent = doc.body.innerHTML.trim();
        
        // Insertar en el editor TAL CUAL
        editorRef.current.innerHTML = bodyContent;
      }
      
      setSelectedTemplate(filename);
    } catch (error) {
      console.error('Error cargando template:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!editorRef.current) return;
    
    try {
      setLoading(true);
      
      // Obtener el contenido editado
      const bodyContent = editorRef.current.innerHTML;
      
      // Reconstruir el HTML COMPLETO con la estructura original
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0;">
    ${bodyContent}
</body>
</html>`;
      
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedTemplate, content: fullHtml }),
      });

      if (res.ok) {
        setToast({ show: true, message: 'Plantilla guardada exitosamente', type: 'success' });
        setTimeout(() => onClose(), 1500);
      }
    } catch (error) {
      setToast({ show: true, message: 'Error guardando plantilla', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const applyColor = (color: string, isBackground: boolean) => {
    if (isBackground) {
      execCommand('hiliteColor', color);
      setShowBgColorPicker(false);
    } else {
      execCommand('foreColor', color);
      setShowTextColorPicker(false);
    }
  };

  const insertLink = () => {
    const url = prompt('URL del enlace:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleClose = () => {
    setToast({ show: false, message: '', type: 'success' });
    onClose();
  };

  if (!show) return null;

  const templateName = selectedTemplate.replace('.html', '');
  const templateTitle = 
    templateName === 'expensas' ? 'Liquidación de Expensas' :
    templateName === 'corte_luz' ? 'Aviso de Corte de Luz' :
    templateName === 'aviso_general' ? 'Aviso General' :
    'Plantilla de Email';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <div>
            <h3 className="text-2xl font-serif font-semibold text-deep-stone">
              Editar: {templateTitle}
            </h3>
            <p className="text-sm text-mineral-taupe mt-1">
              Personalizá el contenido del email • La firma se incluye automáticamente
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-stone-gray rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar estilo Gmail */}
        <div className="px-6 py-3 border-b border-mineral-taupe/10">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Selector de fuente */}
            <select
              onChange={(e) => execCommand('fontName', e.target.value)}
              className="px-3 py-1 rounded border border-mineral-taupe/20 text-sm hover:bg-stone-gray transition-colors"
              defaultValue="Trebuchet MS"
            >
              {FONTS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>

            <div className="w-px h-6 bg-mineral-taupe/20 mx-1" />

            {/* Formato de texto */}
            <button
              onClick={() => execCommand('bold')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Negrita (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => execCommand('italic')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Cursiva (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => execCommand('underline')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Subrayado (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-mineral-taupe/20 mx-1" />

            {/* Color de texto */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTextColorPicker(!showTextColorPicker);
                  setShowBgColorPicker(false);
                }}
                className="p-2 rounded hover:bg-stone-gray transition-colors flex items-center gap-1"
                title="Color de texto"
              >
                <TextColorIcon />
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showTextColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-mineral-taupe/20 p-3 z-50" style={{ width: '240px' }}>
                  <div className="text-xs font-semibold mb-2 text-deep-stone">Color de texto</div>
                  <div className="grid grid-cols-10 gap-1">
                    {COLORS.flat().map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyColor(color, false)}
                        className="w-5 h-5 rounded hover:ring-2 hover:ring-gold-vein transition-all"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Color de fondo */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowBgColorPicker(!showBgColorPicker);
                  setShowTextColorPicker(false);
                }}
                className="p-2 rounded hover:bg-stone-gray transition-colors flex items-center gap-1"
                title="Color de fondo"
              >
                <BgColorIcon />
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBgColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-mineral-taupe/20 p-3 z-50" style={{ width: '240px' }}>
                  <div className="text-xs font-semibold mb-2 text-deep-stone">Color de fondo</div>
                  <div className="grid grid-cols-10 gap-1">
                    {COLORS.flat().map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyColor(color, true)}
                        className="w-5 h-5 rounded hover:ring-2 hover:ring-gold-vein transition-all"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-mineral-taupe/20 mx-1" />

            {/* Alineación */}
            <button
              onClick={() => execCommand('justifyLeft')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Alinear izquierda"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => execCommand('justifyCenter')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Centrar"
            >
              <AlignCenter className="w-4 h-4" />
            </button>

            <button
              onClick={() => execCommand('justifyRight')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Alinear derecha"
            >
              <AlignRight className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-mineral-taupe/20 mx-1" />

            {/* Listas */}
            <button
              onClick={() => execCommand('insertUnorderedList')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Lista con viñetas"
            >
              <List className="w-4 h-4" />
            </button>

            <button
              onClick={() => execCommand('insertOrderedList')}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Lista numerada"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-mineral-taupe/20 mx-1" />

            {/* Link */}
            <button
              onClick={insertLink}
              className="p-2 rounded hover:bg-stone-gray transition-colors"
              title="Insertar enlace"
            >
              <LinkIcon className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-mineral-taupe/20 mx-1" />

            {/* Tamaño */}
            <select
              onChange={(e) => execCommand('fontSize', e.target.value)}
              className="px-3 py-1 rounded border border-mineral-taupe/20 text-sm hover:bg-stone-gray transition-colors"
              defaultValue="3"
            >
              <option value="1">Muy pequeño</option>
              <option value="2">Pequeño</option>
              <option value="3">Normal</option>
              <option value="4">Grande</option>
              <option value="5">Muy grande</option>
              <option value="6">Enorme</option>
            </select>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto p-6 bg-stone-gray/10">
          <div className="bg-white rounded-lg shadow-sm border border-mineral-taupe/10 overflow-hidden">
            {/* Contenido editable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="p-8 focus:outline-none min-h-[400px]"
            />
            
            {/* Firma (no editable) */}
            <div 
              className="p-8 pt-4 border-t border-mineral-taupe/10 bg-stone-gray/5"
              dangerouslySetInnerHTML={{ __html: firmaHtml }}
            />
          </div>
        </div>

        {/* Footer con variables y botones */}
        <div className="px-6 py-4 bg-white border-t border-mineral-taupe/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-mineral-taupe">
              💡 Variables: <code className="px-2 py-1 bg-stone-gray/50 rounded text-xs mx-1">{'{nombre}'}</code> 
              <code className="px-2 py-1 bg-stone-gray/50 rounded text-xs mx-1">{'{depto}'}</code> 
              <code className="px-2 py-1 bg-stone-gray/50 rounded text-xs mx-1">{'{mes_expensas}'}</code> 
              <code className="px-2 py-1 bg-stone-gray/50 rounded text-xs mx-1">{'{fecha_corte}'}</code>
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-lg border-2 border-mineral-taupe/30 hover:bg-stone-gray transition-colors text-sm font-medium text-deep-stone"
              >
                Cancelar
              </button>
              
              <button
                onClick={saveTemplate}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold shadow-md"
                style={{
                  backgroundColor: '#C9B28E',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B89A6A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C9B28E'}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}