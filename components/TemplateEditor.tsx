'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
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

const FONT_SIZES = [
  { label: 'Muy pequeno', value: '10px' },
  { label: 'Pequeno', value: '13px' },
  { label: 'Normal', value: '16px' },
  { label: 'Grande', value: '18px' },
  { label: 'Muy grande', value: '24px' },
  { label: 'Enorme', value: '32px' },
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

/** Convert legacy <font> tags from old execCommand editor to <span> with inline styles */
function sanitizeLegacyHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  const sizeMap: Record<string, string> = {
    '1': '10px', '2': '13px', '3': '16px',
    '4': '18px', '5': '24px', '6': '32px', '7': '48px'
  };

  div.querySelectorAll('font').forEach(font => {
    const span = document.createElement('span');
    const styles: string[] = [];

    const size = font.getAttribute('size');
    if (size) styles.push(`font-size: ${sizeMap[size] || '16px'}`);

    const face = font.getAttribute('face');
    if (face) styles.push(`font-family: ${face}`);

    const color = font.getAttribute('color');
    if (color) styles.push(`color: ${color}`);

    if (styles.length > 0) span.setAttribute('style', styles.join('; '));
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });

  return div.innerHTML;
}

function getTemplateForAction(action: ActionType | null | undefined): string {
  if (!action) return 'expensas.html';
  if (action === 'expensas') return 'expensas.html';
  if (action === 'corte_luz') return 'corte_luz.html';
  if (action === 'avisos_generales') return 'aviso_general.html';
  return 'expensas.html';
}

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

  const extensions = useMemo(() => [
    StarterKit.configure({
      link: { openOnClick: false },
    }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ], []);

  const editorProps = useMemo(() => ({
    attributes: {
      class: 'template-editor-editable',
    },
  }), []);

  const editor = useEditor({
    extensions,
    content: '',
    immediatelyRender: false,
    editorProps,
  });

  const loadFirma = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates?file=firma.html&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFirmaHtml(data.content || '');
    } catch (error) {
      console.error('Error cargando firma:', error);
    }
  }, []);

  const loadTemplate = useCallback(async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/templates?file=${filename}&t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (editor && data.content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.content, 'text/html');
        const bodyContent = sanitizeLegacyHtml(doc.body.innerHTML.trim());
        editor.commands.setContent(bodyContent);
      }

      setSelectedTemplate(filename);
    } catch (error) {
      console.error('Error cargando template:', error);
    } finally {
      setLoading(false);
    }
  }, [editor]);

  useEffect(() => {
    if (show && editor) {
      const templateFile = getTemplateForAction(currentAction);
      loadTemplate(templateFile);
      loadFirma();
    }
  }, [show, currentAction, editor, loadTemplate, loadFirma]);

  useEffect(() => {
    if (show) {
      setToast({ show: false, message: '', type: 'success' });
    }
  }, [show]);

  const saveTemplate = async () => {
    if (!editor) return;

    try {
      setLoading(true);
      const bodyContent = editor.getHTML();

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
      } else {
        setToast({ show: true, message: 'Error guardando plantilla', type: 'error' });
      }
    } catch {
      setToast({ show: true, message: 'Error guardando plantilla', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const insertLink = () => {
    if (!editor) return;
    const url = prompt('URL del enlace:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleClose = () => {
    setToast({ show: false, message: '', type: 'success' });
    onClose();
  };

  const templateName = selectedTemplate.replace('.html', '');
  const templateTitle =
    templateName === 'expensas' ? 'Liquidacion de Expensas' :
    templateName === 'corte_luz' ? 'Aviso de Corte de Luz' :
    templateName === 'aviso_general' ? 'Aviso General' :
    'Plantilla de Email';

  return (
    <div className="template-editor-modal" style={show ? undefined : { display: 'none' }}>
      <div className="template-editor-container">
        <div className="template-editor-header">
          <div>
            <h3 className="template-editor-title">Editar: {templateTitle}</h3>
            <p className="template-editor-subtitle">
              Personaliza el contenido del email - La firma se incluye automaticamente
            </p>
            {/* TODO: Remove this diagnostic */}
            <p style={{ fontSize: '11px', color: editor ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
              Editor: {editor ? (editor.isDestroyed ? 'DESTROYED' : 'READY') : 'NULL'}
              {editor && !editor.isDestroyed && ` | Bold: ${typeof editor.commands.toggleBold}`}
            </p>
          </div>
          <button onClick={handleClose} className="template-toolbar-btn">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="template-editor-toolbar">
          <div className="template-toolbar-group">
            <select
              onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}
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

            <button onClick={() => editor?.chain().focus().toggleBold().run()} className="template-toolbar-btn" title="Negrita (Ctrl+B)">
              <Bold className="w-4 h-4" />
            </button>

            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="template-toolbar-btn" title="Cursiva (Ctrl+I)">
              <Italic className="w-4 h-4" />
            </button>

            <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className="template-toolbar-btn" title="Subrayado (Ctrl+U)">
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
                        onClick={() => {
                          editor?.chain().focus().setColor(color).run();
                          setShowTextColorPicker(false);
                        }}
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
                        onClick={() => {
                          editor?.chain().focus().setBackgroundColor(color).run();
                          setShowBgColorPicker(false);
                        }}
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

            <button onClick={() => editor?.chain().focus().setTextAlign('left').run()} className="template-toolbar-btn" title="Alinear izquierda">
              <AlignLeft className="w-4 h-4" />
            </button>

            <button onClick={() => editor?.chain().focus().setTextAlign('center').run()} className="template-toolbar-btn" title="Centrar">
              <AlignCenter className="w-4 h-4" />
            </button>

            <button onClick={() => editor?.chain().focus().setTextAlign('right').run()} className="template-toolbar-btn" title="Alinear derecha">
              <AlignRight className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className="template-toolbar-btn" title="Lista con vinetas">
              <List className="w-4 h-4" />
            </button>

            <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className="template-toolbar-btn" title="Lista numerada">
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <button onClick={insertLink} className="template-toolbar-btn" title="Insertar enlace">
              <LinkIcon className="w-4 h-4" />
            </button>

            <div className="template-toolbar-divider" />

            <select
              onChange={(e) => editor?.chain().focus().setFontSize(e.target.value).run()}
              className="template-toolbar-select"
              defaultValue="16px"
            >
              {FONT_SIZES.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="template-editor-content">
          <div className="template-editor-paper">
            <EditorContent editor={editor} />

            <div
              className="template-editor-firma"
              dangerouslySetInnerHTML={{ __html: firmaHtml }}
            />
          </div>
        </div>

        <div className="template-editor-footer">
          <div className="template-variables">
            Variables:
            <code className="variable-tag">{'{nombre}'}</code>
            <code className="variable-tag">{'{depto}'}</code>
            {currentAction === 'expensas' && (
              <code className="variable-tag">{'{mes_expensas}'}</code>
            )}
            {currentAction === 'corte_luz' && (
              <code className="variable-tag">{'{fecha_corte}'}</code>
            )}
          </div>

          <div className="template-editor-actions">
            <button onClick={handleClose} className="btn-cancel-modal">
              Cancelar
            </button>

            <button
              onClick={saveTemplate}
              disabled={loading}
              className="btn-send-consorcio"
            >
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
