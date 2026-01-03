'use client';

import { useState, useEffect } from 'react';
import { FileText, Zap, Bell, Upload, Check, X, Send, FileSpreadsheet } from 'lucide-react';
import Header from '@/components/Header';
import ConfirmationModal from '@/components/ConfirmationModal';
import SendingProgress from '@/components/SendingProgress';
import TemplateEditor from '@/components/TemplateEditor';
import ExcelDataViewer from '@/components/ExcelDataViewer';
import BuildingsManager from '@/components/BuildingsManager';
import EnviosHistorial from '@/components/EnviosHistorial';
import { ConfigState, ActionType, SendResult, Edificio } from '@/types';
import Toast from '@/components/Toast';
import { Badge } from '@/components/Badge';
import { Edit } from 'lucide-react';

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
    
    fetch(`/api/templates?file=${fileName}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.content, 'text/html');
          const bodyContent = doc.body.innerHTML;
          setTemplateContent(bodyContent);
        }
      })
      .catch(err => console.error('Error cargando preview:', err));
    
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
    return <p className="loading-text">Cargando preview...</p>;
  }

  return (
    <div>
      <div 
        dangerouslySetInnerHTML={{ __html: templateContent }}
        className="template-preview-content"
      />
      
      {firmaContent && (
        <div 
          dangerouslySetInnerHTML={{ __html: firmaContent }}
          className="template-preview-firma"
        />
      )}
    </div>
  );
}

export default function Home() {
  // Estado de edificios
  const [edificios, setEdificios] = useState<Edificio[]>([]);
  const [selectedEdificioId, setSelectedEdificioId] = useState<string | null>(null);
  const [showBuildingsManager, setShowBuildingsManager] = useState(false);
  const [loadingEdificios, setLoadingEdificios] = useState(true);

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
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [result, setResult] = useState<SendResult | null>(null);

  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showExcelViewer, setShowExcelViewer] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelUnidades, setExcelUnidades] = useState<string[]>([]);
  const [totalUnidades, setTotalUnidades] = useState<number>(0);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const [selectedDeptos, setSelectedDeptos] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Cargar edificios al inicio
  useEffect(() => {
    loadEdificios();
  }, []);

  const loadEdificios = async () => {
    try {
      setLoadingEdificios(true);
      const res = await fetch('/api/buildings');
      const data = await res.json();
      if (data.success) {
        setEdificios(data.data);
        // Seleccionar el primero si hay
        if (data.data.length > 0 && !selectedEdificioId) {
          setSelectedEdificioId(data.data[0].id);
        }
        // Si no hay edificios, mostrar el manager para crear uno
        if (data.data.length === 0) {
          setShowBuildingsManager(true);
        }
      }
    } catch (error) {
      console.error('Error cargando edificios:', error);
    } finally {
      setLoadingEdificios(false);
    }
  };

  const selectedEdificio = edificios.find(e => e.id === selectedEdificioId);

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
    setProgressLines([]); // LIMPIAR LÍNEAS

    const totalItems = totalUnidades;
    setSendingProgress({ sent: 0, total: totalItems, errors: 0 });

    try {
      const formData = new FormData();
      formData.append('action', config.action || '');
      formData.append('testMode', config.testMode.toString());
      formData.append('testEmail', config.testEmail);
      formData.append('pdfFolder', config.pdfFolder);
      formData.append('diasCorte', config.diasCorte?.toString() || '5');

      // Pasar edificio seleccionado
      if (selectedEdificioId) {
        formData.append('buildingId', selectedEdificioId);
      }

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
                setProgressLines(prev => [...prev, data.line]);
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
      <Header
        onOpenExcel={() => setShowExcelViewer(true)}
        onOpenHistorial={() => setShowHistorial(true)}
        edificios={edificios}
        selectedEdificioId={selectedEdificioId}
        onSelectEdificio={setSelectedEdificioId}
        onManageEdificios={() => setShowBuildingsManager(true)}
      />

      <div className="tagline-section">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-mineral-taupe italic">
            Gestión de comunicaciones del consorcio
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
                  
                  <div className="action-icon-container">
                    <Icon />
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
            <div className="consorcio-card">
              <div className="empty-state-container">
                <div className="empty-state-icon">
                  <FileSpreadsheet className="w-10 h-10" />
                </div>
                <h3 className="empty-state-title">
                  Primero cargá los datos
                </h3>
                <p className="empty-state-description">
                  Necesitás un archivo Excel con los destinatarios.<br />
                  Hacé click abajo o en "Gestionar Excel" arriba.
                </p>
                <button
                  onClick={() => setShowExcelViewer(true)}
                  className="btn-send-consorcio"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Cargar datos maestros
                </button>
              </div>
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
                
                {pdfFiles.length > 0 ? (
                  <div className="consorcio-card">
                    <div className="pdf-loaded">
                      <div className="pdf-loaded-icon">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <p className="font-semibold text-deep-stone text-lg mb-1">
                        {pdfFiles.length} archivos PDF cargados
                      </p>
                      <p className="text-sm text-gold-vein mb-3">
                        ✓ Listos para enviar
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPdfFiles([]);
                        }}
                        className="btn-text-consorcio"
                      >
                        Cambiar archivos
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="consorcio-card block">
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
                    
                    <div className="pdf-dropzone">
                      <div className="pdf-dropzone-icon">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h4 className="pdf-dropzone-title">
                        Arrastrá los PDFs acá
                      </h4>
                      <p className="pdf-dropzone-subtitle">
                        o hacé click para buscar
                      </p>
                      <p className="pdf-dropzone-hint">
                        Podés seleccionar múltiples archivos
                      </p>
                    </div>
                  </label>
                )}
              </section>
            )}

            {/* SECCIÓN 2: ARCHIVOS ADJUNTOS (solo corte_luz y avisos) */}
            {config.action !== 'expensas' && config.dataFile && (
              <section className="config-section">
                <div className="config-label">
                  2. Archivos adjuntos (opcional)
                </div>
                
                {attachmentFiles.length > 0 ? (
                  <div className="consorcio-card">
                    <div className="pdf-loaded">
                      <div className="pdf-loaded-icon">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                      <p className="font-semibold text-deep-stone text-lg mb-1">
                        {attachmentFiles.length} archivo{attachmentFiles.length !== 1 ? 's' : ''} cargado{attachmentFiles.length !== 1 ? 's' : ''}
                      </p>
                      <div className="text-sm text-mineral-taupe mt-2 mb-3 max-w-md mx-auto">
                        {attachmentFiles.map((file, idx) => (
                          <div key={idx} className="truncate">• {file.name}</div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setAttachmentFiles([]);
                        }}
                        className="btn-text-consorcio"
                      >
                        Cambiar archivos
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="consorcio-card block">
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
                    
                    <div className="pdf-dropzone">
                      <div className="pdf-dropzone-icon">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h4 className="pdf-dropzone-title">
                        Arrastrá archivos acá
                      </h4>
                      <p className="pdf-dropzone-subtitle">
                        o hacé click para buscar
                      </p>
                      <p className="pdf-dropzone-hint">
                        Cualquier tipo de archivo • Podés seleccionar múltiples
                      </p>
                    </div>
                  </label>
                )}
              </section>
            )}

            {/* SECCIÓN 3: DESTINATARIOS (solo corte_luz y avisos) */}
            {config.action !== 'expensas' && config.dataFile && excelData.length > 0 && (
              <section className="config-section">
                <div className="config-label">
                  3. ¿A quién enviar?
                </div>
                
                <div className="consorcio-card">
                  <label className="recipients-select-all">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                    />
                    <span className="recipients-select-all-label">
                      Enviar a todos ({excelUnidades.length} departamentos)
                    </span>
                  </label>
                  
                  {!selectAll && (
                    <div className="recipients-list">
                      {excelData.map((row, idx) => {
                        const depto = row.Depto || row.depto || row.N || row.n;
                        const nombre = row.Nombre || row.nombre || '';
                        const email = row.Email || row.email || '';
                        
                        return (
                          <label key={idx} className="recipient-item">
                            <input
                              type="checkbox"
                              checked={selectedDeptos.includes(depto)}
                              onChange={() => toggleDepto(depto)}
                            />
                            <div className="recipient-item-content">
                              <p className="recipient-item-name">{depto} - {nombre}</p>
                              <p className="recipient-item-email">{email}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  
                  <p className="recipients-count">
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
                  <div className="email-subject-section">
                    <label className="email-subject-label">Asunto del email</label>
                    
                    {config.action === 'avisos_generales' ? (
                      <input
                        type="text"
                        value={config.subject || ''}
                        onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                        placeholder="Ej: Comunicado importante del consorcio"
                        className="email-subject-input"
                      />
                    ) : (
                      <>
                        <div className="email-subject-display">
                          {config.action === 'expensas' && (
                            <span>
                              COMUNICACIONES - Liquidación de Expensas{' '}
                              <code className="variable-tag">{'{mes_expensas}'}</code> - DEPTO{' '}
                              <code className="variable-tag">{'{depto}'}</code>
                            </span>
                          )}
                          {config.action === 'corte_luz' && (
                            <span>AVISO FORMAL - Corte de suministro eléctrico programado</span>
                          )}
                        </div>
                        <div className="email-subject-hint">
                          ℹ️ Este asunto se genera automáticamente
                        </div>
                      </>
                    )}
                  </div>

                  {/* CONTENIDO */}
                  <div>
                    <div className="email-content-header">
                      <label className="email-content-label">Contenido del email</label>
                      <button
                        onClick={() => setShowTemplateEditor(true)}
                        className="btn-secondary-consorcio"
                      >
                        <Edit className="w-4 h-4" />
                        Editar plantilla
                      </button>
                    </div>
                    
                    <div className="email-preview-container">
                      <div className="email-preview-header">
                        <span>Vista previa del email</span>
                      </div>
                      
                      <div className="email-preview-body">
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
                  <label className="test-mode-full-wrapper">
                    <input
                      type="checkbox"
                      checked={config.testMode}
                      onChange={(e) => setConfig({ ...config, testMode: e.target.checked })}
                    />
                    <div className="test-mode-full-content">
                      <p className="test-mode-full-title">Modo de prueba</p>
                      <p className="test-mode-full-description">
                        Enviar todos los emails solo a mi dirección
                      </p>
                      
                      {config.testMode && (
                        <input
                          type="email"
                          value={config.testEmail}
                          onChange={(e) => setConfig({ ...config, testEmail: e.target.value })}
                          placeholder="tu@email.com"
                          className="test-mode-email-input"
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
              <div className="send-button-wrapper">
                <button
                  onClick={() => {
                    if (config.testMode && !config.testEmail) {
                      setToast({ show: true, message: 'Falta el email de prueba', type: 'error' });
                      return;
                    }
                    setShowConfirmation(true);
                  }}
                  disabled={sending}
                  className="btn-send-consorcio send-button-large"
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
          <div className={`result-card consorcio-card ${
            result.success ? 'result-card-success' : 'result-card-error'
          }`}>
            <div className="result-card-content">
              {result.success ? (
                <Check className="result-card-icon result-card-icon-success" />
              ) : (
                <X className="result-card-icon result-card-icon-error" />
              )}
              
              <div className="result-card-body">
                <h3 className="result-card-title">{result.message}</h3>
                
                {result.success && (
                  <div className="result-card-badges">
                    <Badge variant="success">✓ {result.sent} enviados</Badge>
                    {result.errors > 0 && (
                      <Badge variant="error">✗ {result.errors} errores</Badge>
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

      <BuildingsManager
        show={showBuildingsManager}
        onClose={() => setShowBuildingsManager(false)}
        onEdificioCreated={(edificio) => {
          setEdificios([...edificios, edificio]);
          setSelectedEdificioId(edificio.id);
        }}
        onEdificioUpdated={(edificio) => {
          setEdificios(edificios.map(e => e.id === edificio.id ? edificio : e));
        }}
        onEdificioDeleted={(id) => {
          setEdificios(edificios.filter(e => e.id !== id));
          if (selectedEdificioId === id) {
            setSelectedEdificioId(edificios[0]?.id || null);
          }
        }}
      />

      <EnviosHistorial
        show={showHistorial}
        onClose={() => setShowHistorial(false)}
        edificioId={selectedEdificioId}
        edificioNombre={selectedEdificio?.nombre || ''}
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
            © 2026 {selectedEdificio?.nombre || 'Consorcio Expensas'} • MxrCabrera Dev
          </p>
        </div>
      </footer>
    </div>
  );
}