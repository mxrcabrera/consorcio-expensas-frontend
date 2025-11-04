'use client';

import { useState, useEffect, useRef } from 'react';
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

const TextColorIcon = () => (
  <div className="text-color-icon">
    <span className="text-color-icon-letter">A</span>
    <div className="text-color-icon-underline" />
  </div>
);

const BgColorIcon = () => (
  <div className="bg-color-icon">
    <span className="bg-color-icon-letter">A</span>
    <div className="bg-color-icon-bg" />
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
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.content, 'text/html');
        const bodyContent = doc.body.innerHTML.trim();
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
      const bodyContent = editorRef.current.innerHTML;
      
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Trebuchet MS', Arial, sans-serif; 
            color: #1f4e78; 
            line-height: 1.6;
            background-color: #ffffff;
        }
        h1 {
            font-size: 20px;
            margin: 0 0 15px 0;
            font-weight: bold;
            color: #1f4e78;
            line-height: 1.4;
        }
        h2 {
            font-size: 18px;
            margin: 20px 0 10px 0;
            color: #1c4587;
            font-weight: bold;
            line-height: 1.4;
        }
        h3 {
            font-size: 16px;
            margin: 15px 0 10px 0;
            color: #1c4587;
            font-weight: bold;
            line-height: 1.4;
        }
        p {
            margin: 0 0 12px 0;
            line-height: 1.6;
        }
        ul {
            margin: 12px 0;
            padding-left: 24px;
        }
        li {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        strong {
            color: #1f4e78;
            font-weight: bold;
        }
        hr {
            border: none;
            border-top: 2px solid #e0e0e0;
            margin: 20px 0;
        }
    </style>
</head>
<body>
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
    <div className="template-editor-modal">
      <div className="template-editor-container">
        <div className="template-editor-header">
          <div>
            <h3 className="template-editor-title">Editar: {templateTitle}</h3>
            <p className="template-editor-subtitle">
              Personalizá el contenido del email • La firma se incluye automáticamente
            </p>
          </div>
          <button onClick={handleClose} className="template-toolbar-btn">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="template-editor-toolbar">
          <div className="template-toolbar-group">
            <select
              onChange={(e) => execCommand('fontName', e.target.value)}
              className="template-toolbar-select"
              defaultValue="Trebuchet MS"
            >
              {FONTS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>

            <div className="template-toolbar-divider" />

            <button onClick={() => execCommand('bold')} className="template-toolbar-btn" title="Negrita (Ctrl+B)">
              <Bold className="w-4 h-4" />
            </button>
            
            <button onClick={() => execCommand('italic')} className="template-toolbar-btn" title="Cursiva (Ctrl+I)">
              <Italic className="w-4 h-4" />
            </button>
            
            <button onClick={() => execCommand('underline')} className="template-toolbar-btn" title="Subrayado (Ctrl+U)">
              <Underline className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <div className="relative">
              <button
                onClick={() => {
                  setShowTextColorPicker(!showTextColorPicker);
                  setShowBgColorPicker(false);
                }}
                className="template-toolbar-btn toolbar-btn-group"
                title="Color de texto"
              >
                <TextColorIcon />
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showTextColorPicker && (
                <div className="color-picker-dropdown">
                  <div className="color-picker-title">Color de texto</div>
                  <div className="color-picker-grid">
                    {COLORS.flat().map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyColor(color, false)}
                        className="color-picker-swatch"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowBgColorPicker(!showBgColorPicker);
                  setShowTextColorPicker(false);
                }}
                className="template-toolbar-btn toolbar-btn-group"
                title="Color de fondo"
              >
                <BgColorIcon />
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBgColorPicker && (
                <div className="color-picker-dropdown">
                  <div className="color-picker-title">Color de fondo</div>
                  <div className="color-picker-grid">
                    {COLORS.flat().map((color, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyColor(color, true)}
                        className="color-picker-swatch"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="template-toolbar-divider" />

            <button onClick={() => execCommand('justifyLeft')} className="template-toolbar-btn" title="Alinear izquierda">
              <AlignLeft className="w-4 h-4" />
            </button>
            
            <button onClick={() => execCommand('justifyCenter')} className="template-toolbar-btn" title="Centrar">
              <AlignCenter className="w-4 h-4" />
            </button>

            <button onClick={() => execCommand('justifyRight')} className="template-toolbar-btn" title="Alinear derecha">
              <AlignRight className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <button onClick={() => execCommand('insertUnorderedList')} className="template-toolbar-btn" title="Lista con viñetas">
              <List className="w-4 h-4" />
            </button>

            <button onClick={() => execCommand('insertOrderedList')} className="template-toolbar-btn" title="Lista numerada">
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <button onClick={insertLink} className="template-toolbar-btn" title="Insertar enlace">
              <LinkIcon className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <select
              onChange={(e) => execCommand('fontSize', e.target.value)}
              className="template-toolbar-select"
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

        <div className="template-editor-content">
          <div className="template-editor-paper">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="template-editor-editable"
            />
            
            <div 
              className="template-editor-firma"
              dangerouslySetInnerHTML={{ __html: firmaHtml }}
            />
          </div>
        </div>

        <div className="template-editor-footer">
          <div className="template-variables">
            💡 Variables: 
            <code className="variable-tag">{'{nombre}'}</code> 
            <code className="variable-tag">{'{depto}'}</code> 
            <code className="variable-tag">{'{mes_expensas}'}</code>
          </div>

          <div className="template-editor-actions">
            <button onClick={handleClose} className="btn-cancel-modal">
              Cancelar
            </button>
            
            <button onClick={saveTemplate} disabled={loading} className="btn-send-consorcio">
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
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