'use client';

import { useState, useEffect } from 'react';
import { FileText, Zap, Bell, Upload, Check, X, Send, FileSpreadsheet } from 'lucide-react';
import Header from '@/components/Header';
import ConfirmationModal from '@/components/ConfirmationModal';
import SendingProgress from '@/components/SendingProgress';
import TemplateEditor from '@/components/TemplateEditor';
import ExcelDataViewer from '@/components/ExcelDataViewer';
import { ConfigState, ActionType, SendResult } from '@/types';
import Toast from '@/components/Toast';
import { Badge } from '@/components/Badge';

// Componente para preview del template
function TemplatePreview({ action, refreshKey }: { action: ActionType | null; refreshKey: number }) {
  const [templateContent, setTemplateContent] = useState<string>('');
  const [firmaContent, setFirmaContent] = useState<string>('');

  useEffect(() => {
    if (!action) return;
    
    const fileName = 
      action === 'expensas' ? 'expensas.html' :
      action === 'corte_luz' ? 'corte_luz.html' :
      'aviso_general.html';
    
    // Cargar template completo
    fetch(`/api/templates?file=${fileName}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          // Extraer solo el contenido del body manteniendo los estilos
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.content, 'text/html');
          const bodyContent = doc.body.innerHTML;
          setTemplateContent(bodyContent);
        }
      })
      .catch(err => console.error('Error cargando preview:', err));
    
    // Cargar firma completa
    fetch(`/api/templates?file=firma.html&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.content, 'text/html');
          const bodyContent = doc.body.innerHTML;
          setFirmaContent(bodyContent);
        }
      })
      .catch(err => console.error('Error cargando firma:', err));
  }, [action, refreshKey]);

  if (!templateContent) {
    return <p className="text-sm text-mineral-taupe">Cargando preview...</p>;
  }

  return (
    <div>
      {/* Contenido del template - con estilos azules */}
      <div 
        dangerouslySetInnerHTML={{ __html: templateContent }}
        style={{
          fontFamily: "'Trebuchet MS', Arial, sans-serif",
          color: '#1f4e78',
          lineHeight: '1.6',
          backgroundColor: '#ffffff',
          padding: '0'
        }}
      />
      
      {/* Firma - con sus propios estilos (sin color azul) */}
      {firmaContent && (
        <div 
          dangerouslySetInnerHTML={{ __html: firmaContent }}
          style={{
            fontFamily: "'Trebuchet MS', Arial, sans-serif",
            lineHeight: '1.5',
            backgroundColor: '#ffffff'
            // NO aplicamos color aquí para que use los estilos de la firma
          }}
        />
      )}
    </div>
  );
}

export default function Home() {
  const [config, setConfig] = useState<ConfigState>({
    action: null,
    testMode: false,
    testEmail: '',
    dataFile: null,
    pdfFolder: '',
    month: '',
    subject: '',
    diasCorte: 5,
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ sent: 0, total: 0, errors: 0 });
  const [progressLines, setProgressLines] = useState<string[]>([]); // 🔥 NUEVO
  const [result, setResult] = useState<SendResult | null>(null);

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showExcelViewer, setShowExcelViewer] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelUnidades, setExcelUnidades] = useState<string[]>([]);
  const [totalUnidades, setTotalUnidades] = useState<number>(0);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  
  const [selectedDeptos, setSelectedDeptos] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const actions = [
    { id: 'expensas' as ActionType, icon: FileText, title: 'Envío de Expensas', desc: 'Con PDFs adjuntos' },
    { id: 'corte_luz' as ActionType, icon: Zap, title: 'Corte de Luz', desc: 'Aviso programado' },
    { id: 'avisos_generales' as ActionType, icon: Bell, title: 'Avisos Generales', desc: 'Comunicado del consorcio' },
  ];

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const handleExcelUpload = async (file: File) => {
    setConfig({ ...config, dataFile: file });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/excel', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success && data.data) {
        setExcelData(data.data);
        
        const unidades = data.data.map((row: any) => 
          row.N || row.n || row.Depto || row.depto || row.Unidad || row.unidad || ''
        ).filter(Boolean);
        
        setExcelUnidades(unidades);
        setTotalUnidades(data.data.length);
        
        console.log('📊 Excel cargado:', {
          total: data.data.length,
          unidades,
          primeraFila: data.data[0]
        });
      }
    } catch (error) {
      console.error('Error leyendo Excel:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedDeptos([]);
    } else {
      setSelectedDeptos([...excelUnidades]);
    }
    setSelectAll(!selectAll);
  };

  const toggleDepto = (depto: string) => {
    if (selectedDeptos.includes(depto)) {
      setSelectedDeptos(selectedDeptos.filter(d => d !== depto));
      setSelectAll(false);
    } else {
      setSelectedDeptos([...selectedDeptos, depto]);
      if (selectedDeptos.length + 1 === excelUnidades.length) {
        setSelectAll(true);
      }
    }
  };

  const canSend = () => {
    if (!config.action || !config.dataFile || totalUnidades === 0) return false;
    if (config.testMode && !config.testEmail) return false;
    if (config.action === 'expensas' && pdfFiles.length === 0) return false;
    if (config.action !== 'expensas' && selectedDeptos.length === 0) return false;
    return true;
  };

  const handleConfirmSend = async () => {
    setShowConfirmation(false);
    setSending(true);
    setResult(null);
    setProgressLines([]); // 🔥 LIMPIAR LÍNEAS

    const totalItems = totalUnidades;
    setSendingProgress({ sent: 0, total: totalItems, errors: 0 });

    try {
      const formData = new FormData();
      formData.append('action', config.action || '');
      formData.append('testMode', config.testMode.toString());
      formData.append('testEmail', config.testEmail);
      formData.append('pdfFolder', config.pdfFolder);
      formData.append('diasCorte', config.diasCorte?.toString() || '5');
      
      if (config.subject) {
        formData.append('subject', config.subject);
      }
      
      if (config.dataFile) {
        formData.append('dataFile', config.dataFile);
      }

      const response = await fetch('/api/enviar', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sentCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setProgressLines(prev => [...prev, data.line]); // 🔥 AGREGAR LÍNEA
                sentCount++;
                setSendingProgress({ sent: sentCount, total: totalItems, errors: 0 });
              } else if (data.type === 'complete') {
                if (data.success) {
                  setSendingProgress({ sent: data.sent, total: totalItems, errors: data.errors });
                  setResult({
                    success: true,
                    sent: data.sent,
                    errors: data.errors,
                    message: data.message,
                  });
                } else {
                  setResult({
                    success: false,
                    sent: 0,
                    errors: 0,
                    message: data.message,
                  });
                }
              }
            } catch (e) {
              console.error('Error parseando JSON:', e);
            }
          }
        }
      }
    } catch (error) {
      setResult({
        success: false,
        sent: 0,
        errors: 0,
        message: 'Error de conexión',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header onOpenExcel={() => setShowExcelViewer(true)} />

      <div className="tagline-section">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-mineral-taupe italic">
            Simple, rápido y efectivo
          </p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* SECCIÓN 1: TIPO DE ENVÍO */}
        <section className="config-section">
          <div className="config-label">
            1. ¿Qué querés enviar?
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {actions.map((action) => {
              const Icon = action.icon;
              const isSelected = config.action === action.id;
              
              return (
                <button
                  key={action.id}
                  onClick={() => setConfig({ ...config, action: action.id })}
                  className={`action-option ${isSelected ? 'action-option-selected' : ''}`}
                >
                  {isSelected && (
                    <div className="check-icon">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    background: 'var(--stone-gray)'
                  }}>
                    <Icon className="w-8 h-8" style={{ stroke: 'var(--mineral-taupe)' }} />
                  </div>
                  
                  <h3 className="action-label">{action.title}</h3>
                  <p className="action-desc">{action.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* MENSAJE: Cargar Excel primero */}
        {config.action && !config.dataFile && (
          <section className="config-section">
            <div className="consorcio-card text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{
                background: 'linear-gradient(135deg, var(--gold-vein), var(--gold-accent))'
              }}>
                <FileSpreadsheet className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-deep-stone mb-2">
                Primero cargá los datos
              </h3>
              <p className="text-sm text-mineral-taupe mb-4">
                Hacé click en "Gestionar Excel" arriba para cargar el archivo con los destinatarios
              </p>
              <button
                onClick={() => setShowExcelViewer(true)}
                className="px-6 py-3 rounded-lg transition-colors font-medium"
                style={{
                  backgroundColor: '#C9B28E',
                  color: '#FFFFFF'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B89A6A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C9B28E'}
              >
                Cargar datos maestros
              </button>
            </div>
          </section>
        )}

        {config.action && config.dataFile && (
          <>
            {/* SECCIÓN 2: PDFs (solo expensas) */}
            {config.action === 'expensas' && config.dataFile && (
              <section className="config-section">
                <div className="config-label">
                  2. Archivos PDF
                </div>
                
                <label className="consorcio-card cursor-pointer hover:border-gold-vein transition-all block">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        setPdfFiles(files);
                      }
                    }}
                  />
                  
                  <div className="text-center py-12">
                    {pdfFiles.length > 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                          background: 'linear-gradient(135deg, var(--gold-vein), var(--gold-accent))'
                        }}>
                          <Check className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-deep-stone">
                            {pdfFiles.length} archivos PDF cargados
                          </p>
                          <p className="text-sm text-gold-vein mt-1">
                            ✓ Listos para enviar
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setPdfFiles([]);
                          }}
                          className="text-sm text-mineral-taupe hover:text-deep-stone mt-2"
                        >
                          Cambiar archivos
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-12 h-12 text-mineral-taupe" />
                        <div>
                          <p className="font-semibold text-deep-stone">Arrastrá los PDFs acá</p>
                          <p className="text-sm text-mineral-taupe mt-1">o hacé click para buscar</p>
                          <p className="text-xs text-mineral-taupe mt-2">Podés seleccionar múltiples archivos</p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </section>
            )}

            {/* SECCIÓN 2: ARCHIVOS ADJUNTOS (solo corte_luz y avisos) */}
            {config.action !== 'expensas' && config.dataFile && (
              <section className="config-section">
                <div className="config-label">
                  2. Archivos adjuntos (opcional)
                </div>
                
                <label className="consorcio-card cursor-pointer hover:border-gold-vein transition-all block">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        const files = Array.from(e.target.files);
                        setAttachmentFiles(files);
                      }
                    }}
                  />
                  
                  <div className="text-center py-12">
                    {attachmentFiles.length > 0 ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                          background: 'linear-gradient(135deg, var(--gold-vein), var(--gold-accent))'
                        }}>
                          <Check className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-deep-stone">
                            {attachmentFiles.length} archivo{attachmentFiles.length !== 1 ? 's' : ''} cargado{attachmentFiles.length !== 1 ? 's' : ''}
                          </p>
                          <div className="text-xs text-mineral-taupe mt-2 max-w-md mx-auto">
                            {attachmentFiles.map((file, idx) => (
                              <div key={idx} className="truncate">• {file.name}</div>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setAttachmentFiles([]);
                          }}
                          className="text-sm text-mineral-taupe hover:text-deep-stone mt-2"
                        >
                          Cambiar archivos
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-12 h-12 text-mineral-taupe" />
                        <div>
                          <p className="font-semibold text-deep-stone">Arrastrá archivos acá</p>
                          <p className="text-sm text-mineral-taupe mt-1">o hacé click para buscar</p>
                          <p className="text-xs text-mineral-taupe mt-2">Cualquier tipo de archivo • Podés seleccionar múltiples</p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </section>
            )}

            {/* SECCIÓN 3: DESTINATARIOS (solo corte_luz y avisos) */}
            {config.action !== 'expensas' && config.dataFile && excelData.length > 0 && (
              <section className="config-section">
                <div className="config-label">
                  3. ¿A quién enviar?
                </div>
                
                <div className="consorcio-card">
                  <label className="flex items-center gap-3 p-4 bg-gold-vein/5 rounded-lg border-2 border-gold-vein/20 cursor-pointer hover:bg-gold-vein/10 transition-colors mb-4">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="w-5 h-5"
                    />
                    <span className="font-semibold text-deep-stone">
                      Enviar a todos ({excelUnidades.length} departamentos)
                    </span>
                  </label>
                  
                  {!selectAll && (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {excelData.map((row, idx) => {
                        const depto = row.Depto || row.depto || row.N || row.n;
                        const nombre = row.Nombre || row.nombre || '';
                        const email = row.Email || row.email || '';
                        
                        return (
                          <label
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-gray/30 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDeptos.includes(depto)}
                              onChange={() => toggleDepto(depto)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-deep-stone">{depto} - {nombre}</p>
                              <p className="text-xs text-mineral-taupe">{email}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  
                  <p className="text-sm text-mineral-taupe mt-4">
                    {selectedDeptos.length} destinatario{selectedDeptos.length !== 1 ? 's' : ''} seleccionado{selectedDeptos.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </section>
            )}

            {/* SECCIÓN 3/4: MENSAJE DEL EMAIL */}
            {config.action && config.dataFile && totalUnidades > 0 && (
              (config.action === 'expensas' && pdfFiles.length > 0) || 
              (config.action !== 'expensas' && excelData.length > 0)
            ) && (
              <section className="config-section">
                <div className="config-label">
                  {config.action === 'expensas' ? '3' : '4'}. Mensaje del email
                </div>
                
                <div className="consorcio-card">
                  {/* ASUNTO */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-deep-stone mb-3">
                      Asunto del email
                    </label>
                    
                    {config.action === 'avisos_generales' ? (
                      <input
                        type="text"
                        value={config.subject || ''}
                        onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                        placeholder="Ej: Comunicado importante del consorcio"
                        className="w-full px-4 py-3 rounded-lg border-2 border-mineral-taupe/20 focus:border-gold-vein focus:outline-none text-deep-stone"
                      />
                    ) : (
                      <>
                        <div className="px-4 py-3 rounded-lg bg-stone-gray/30 border-2 border-mineral-taupe/10 text-deep-stone text-sm">
                          {config.action === 'expensas' && (
                            <span>COMUNICACIONES - Liquidación de Expensas <code className="px-2 py-1 bg-white rounded text-xs mx-1">{'{mes_expensas}'}</code> - DEPTO <code className="px-2 py-1 bg-white rounded text-xs mx-1">{'{depto}'}</code></span>
                          )}
                          {config.action === 'corte_luz' && (
                            <span>AVISO FORMAL - Corte de suministro eléctrico programado</span>
                          )}
                        </div>
                        <p className="text-xs text-mineral-taupe mt-2 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-xs">ℹ️</span>
                          Este asunto se genera automáticamente
                        </p>
                      </>
                    )}
                  </div>

                  {/* CONTENIDO */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-deep-stone">
                        Contenido del email
                      </label>
                      <button
                        onClick={() => setShowTemplateEditor(true)}
                        className="text-sm text-gold-vein hover:text-gold-accent transition-colors font-medium flex items-center gap-2"
                      >
                        ✏️ Editar plantilla
                      </button>
                    </div>
                    
                    {/* Preview del template */}
                    <div className="rounded-lg border-2 border-mineral-taupe/20 overflow-hidden bg-white">
                      {/* Header simple */}
                      <div className="bg-stone-gray/20 px-4 py-2 border-b border-mineral-taupe/10">
                        <span className="text-xs font-medium text-mineral-taupe">📧 Vista previa del email</span>
                      </div>
                      
                      {/* Contenido del template */}
                      <div className="p-6 max-h-96 overflow-y-auto">
                        <TemplatePreview action={config.action} refreshKey={refreshKey} />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* MODO TEST */}
            {config.action && config.dataFile && totalUnidades > 0 && (
              (config.action === 'expensas' && pdfFiles.length > 0) || 
              (config.action !== 'expensas' && excelData.length > 0)
            ) && (
              <section className="config-section">
                <div className="consorcio-card">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.testMode}
                      onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                      className="w-5 h-5 mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-deep-stone">Modo de prueba</p>
                      <p className="text-sm text-mineral-taupe mt-1">Enviar todos los emails solo a mi dirección</p>
                      
                      {config.testMode && (
                        <input
                          type="email"
                          value={config.testEmail}
                          onChange={(e) => setConfig({ ...config, testEmail: e.target.value })}
                          placeholder="tu@email.com"
                          className="w-full px-4 py-3 border-2 border-mineral-taupe/20 rounded-lg mt-3 focus:outline-none focus:border-gold-vein"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </section>
            )}

            {/* BOTÓN ENVIAR */}
            {config.action && config.dataFile && totalUnidades > 0 && (
              (config.action === 'expensas' && pdfFiles.length > 0) || 
              (config.action !== 'expensas' && selectedDeptos.length > 0)
            ) && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => {
                    if (config.testMode && !config.testEmail) {
                      setToast({ show: true, message: 'Falta el email de prueba', type: 'error' });
                      return;
                    }
                    setShowConfirmation(true);
                  }}
                  disabled={sending}
                  className="btn-send-consorcio text-lg px-12 py-4"
                >
                  <Send className="w-6 h-6" />
                  ENVIAR {config.action === 'expensas' ? 'EXPENSAS' : config.action === 'corte_luz' ? 'AVISOS' : 'COMUNICADO'}
                </button>
              </div>
            )}
          </>
        )}

        {/* RESULTADO */}
        {result && (
          <div className={`mt-10 consorcio-card ${
            result.success 
              ? 'border-2 border-gold-vein/50' 
              : 'border-2 border-red-400/50'
          }`}>
            <div className="flex items-start gap-4">
              {result.success ? (
                <Check className="w-10 h-10 text-gold-vein shrink-0" />
              ) : (
                <X className="w-10 h-10 text-red-600 shrink-0" />
              )}
              
              <div className="flex-1">
                <h3 className="text-xl font-serif font-semibold mb-2 text-deep-stone">
                  {result.message}
                </h3>
                
                {result.success && (
                  <div className="flex gap-3 mt-4">
                    <Badge variant="success">
                      ✓ {result.sent} enviados
                    </Badge>
                    {result.errors > 0 && (
                      <Badge variant="error">
                        ✗ {result.errors} errores
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ConfirmationModal
        show={showConfirmation}
        config={config}
        totalEmails={config.action === 'expensas' ? pdfFiles.length : totalUnidades}
        totalUnidades={totalUnidades}
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirmation(false)}
      />

      <SendingProgress
        show={sending}
        sent={sendingProgress.sent}
        total={sendingProgress.total}
        errors={sendingProgress.errors}
        lines={progressLines}
      />

      <TemplateEditor
        show={showTemplateEditor}
        onClose={() => {
          setShowTemplateEditor(false);
          setRefreshKey(prev => prev + 1);
        }}
        currentAction={config.action}
      />

      <ExcelDataViewer
        show={showExcelViewer}
        file={config.dataFile}
        onClose={() => setShowExcelViewer(false)}
        onFileSelect={handleExcelUpload}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <footer className="consorcio-footer">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-mineral-taupe">
            © 2025 Consorcio Expensas • MxrCabrera Dev
          </p>
        </div>
      </footer>
    </div>
  );
}