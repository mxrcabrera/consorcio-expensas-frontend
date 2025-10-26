'use client';

import { useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import ProgressBar from '@/components/ProgressBar';
import ActionSelector from '@/components/ActionSelector';
import TestModeToggle from '@/components/TestModeToggle';
import FileUpload from '@/components/FileUpload';
import PDFFolderInput from '@/components/PDFFolderInput';
import SubjectInput from '@/components/SubjectInput';
import CorteLuzConfig from '@/components/CorteLuzConfig';
import ConfigSummary from '@/components/ConfigSummary';
import SendButton from '@/components/SendButton';
import ConfirmationModal from '@/components/ConfirmationModal';
import SendingProgress from '@/components/SendingProgress';
import TemplateEditor from '@/components/TemplateEditor';
import ExcelDataViewer from '@/components/ExcelDataViewer';
import PDFValidator from '@/components/PDFValidator';
import { ConfigState, ActionType, SendResult } from '@/types';
import { getProgressPercentage } from '@/lib/utils';

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
  const [result, setResult] = useState<SendResult | null>(null);

  // Modals
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showExcelViewer, setShowExcelViewer] = useState(false);
  const [showPDFValidator, setShowPDFValidator] = useState(false);
  const [excelUnidades, setExcelUnidades] = useState<string[]>([]);
  const [totalUnidades, setTotalUnidades] = useState<number>(0);
  const [totalPDFs, setTotalPDFs] = useState<number>(0); // ← NUEVO

  const progress = getProgressPercentage({
    action: config.action,
    testEmail: config.testEmail,
    testMode: config.testMode,
    month: '',
    dataFile: config.dataFile,
  });

  const canSend = () => {
    if (!config.action || !config.dataFile || totalUnidades === 0) return false;
    if (config.testMode && !config.testEmail) return false;
    
    if (config.action === 'expensas' && (!config.pdfFolder || totalPDFs === 0)) return false;
    if (config.action === 'avisos_generales' && !config.subject) return false;
    
    return true;
  };

  const handleSendClick = () => {
    if (!canSend()) return;
    setShowConfirmation(true);
  };

  // ← NUEVA FUNCIÓN
  const validarPDFs = async (pdfFolder: string, unidades: string[]) => {
    if (!pdfFolder || unidades.length === 0) return;
    
    try {
      const res = await fetch('/api/validate-pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfFolder, unidades }),
      });
      
      const data = await res.json();
      if (data.totalPDFs !== undefined) {
        setTotalPDFs(data.totalPDFs);
        console.log(`📄 Total de PDFs encontrados: ${data.totalPDFs}`);
      }
    } catch (error) {
      console.error('Error validando PDFs:', error);
      setTotalPDFs(0);
    }
  };

  const handleConfirmSend = async () => {
    setShowConfirmation(false);
    setSending(true);
    setResult(null);

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

      if (!response.body) {
        throw new Error('No response body');
      }

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
              console.log('Evento recibido:', data);

              if (data.type === 'progress') {
                sentCount++;
                console.log(`Progreso: ${sentCount}/${totalItems}`);
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
              console.error('Error parseando JSON:', e, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error en envío:', error);
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

  const handleFileSelect = async (file: File | null) => {
    setConfig({ ...config, dataFile: file });
    
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/excel', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.success && data.data) {
          const unidadesN = data.data.map((row: any) => row.N || row.n || '').filter(Boolean);
          const unidadesDepto = data.data.map((row: any) => row.Depto || row.depto || '').filter(Boolean);
          
          setExcelUnidades(unidadesN);
          setTotalUnidades(data.data.length);
          console.log(`📊 Excel cargado: ${data.data.length} unidades funcionales`);
          
          // ← VALIDAR PDFs SI YA HAY CARPETA
          if (config.pdfFolder && config.action === 'expensas' && unidadesN.length > 0) {
            validarPDFs(config.pdfFolder, unidadesN);
          }
        } else {
          setTotalUnidades(0);
          setTotalPDFs(0);
        }
      } catch (error) {
        console.error('Error leyendo Excel:', error);
        setTotalUnidades(0);
        setTotalPDFs(0);
      }
    } else {
      setExcelUnidades([]);
      setTotalUnidades(0);
      setTotalPDFs(0);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="tagline-section">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-mineral-taupe italic">
            Gestión profesional de notificaciones para consorcios
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 flex gap-4 justify-end">
          <button
            onClick={() => setShowTemplateEditor(true)}
            className="px-4 py-2 rounded-lg border-2 border-mineral-taupe/20
                     hover:border-gold-vein hover:bg-gold-vein/5 transition-all text-sm font-medium"
          >
            📝 Editar Templates
          </button>
          
          {config.dataFile && (
            <button
              onClick={() => setShowExcelViewer(true)}
              className="px-4 py-2 rounded-lg border-2 border-mineral-taupe/20
                       hover:border-gold-vein hover:bg-gold-vein/5 transition-all text-sm font-medium"
            >
              📊 Ver Datos Excel
            </button>
          )}
          
          {config.action === 'expensas' && config.pdfFolder && excelUnidades.length > 0 && (
            <button
              onClick={() => setShowPDFValidator(true)}
              className="px-4 py-2 rounded-lg border-2 border-mineral-taupe/20
                       hover:border-gold-vein hover:bg-gold-vein/5 transition-all text-sm font-medium"
            >
              📄 Validar PDFs
            </button>
          )}
        </div>

        <ProgressBar percentage={progress} />

        <ActionSelector
          selectedAction={config.action}
          onSelect={(action: ActionType) => 
            setConfig({ 
              ...config, 
              action,
              subject: action === 'avisos_generales' ? '' : config.subject,
            })
          }
        />

        <TestModeToggle
          testMode={config.testMode}
          testEmail={config.testEmail}
          onToggle={(testMode: boolean) => setConfig({ ...config, testMode })}
          onEmailChange={(testEmail: string) => setConfig({ ...config, testEmail })}
        />

        {config.action === 'expensas' && (
          <PDFFolderInput
            folder={config.pdfFolder}
            onChange={(pdfFolder: string) => {
              setConfig({ ...config, pdfFolder });
              // ← VALIDAR CUANDO CAMBIA LA CARPETA
              if (pdfFolder && excelUnidades.length > 0) {
                validarPDFs(pdfFolder, excelUnidades);
              }
            }}
          />
        )}

        {config.action === 'corte_luz' && (
          <CorteLuzConfig
            diasCorte={config.diasCorte || 5}
            onChange={(diasCorte: number) => setConfig({ ...config, diasCorte })}
          />
        )}

        {config.action === 'avisos_generales' && (
          <SubjectInput
            subject={config.subject || ''}
            onChange={(subject: string) => setConfig({ ...config, subject })}
          />
        )}

        <FileUpload
          file={config.dataFile}
          onFileSelect={handleFileSelect}
        />

        <div className="mt-12">
          <ConfigSummary config={config} />
        </div>

        {result && (
          <div className={`mt-8 consorcio-card ${
            result.success 
              ? 'border-2 border-gold-vein/50 bg-linear-to-br from-green-50 via-white to-gold-light/20' 
              : 'border-2 border-red-400/50 bg-linear-to-br from-red-50 via-white to-red-100/20'
          }`}>
            <div className="flex items-start gap-4">
              {result.success ? (
                <CheckCircle className="w-8 h-8 text-gold-vein shrink-0 mt-1" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 shrink-0 mt-1" />
              )}
              
              <div className="flex-1">
                <h3 className={`text-xl font-serif font-semibold mb-2 ${
                  result.success ? 'text-deep-stone' : 'text-red-800'
                }`}>
                  {result.message}
                </h3>
                
                {result.success && (
                  <div className="flex items-center gap-6 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gold-vein"></div>
                      <span className="text-mineral-taupe">Enviados: <strong className="text-deep-stone">{result.sent}</strong></span>
                    </div>
                    {result.errors > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-mineral-taupe">Errores: <strong className="text-red-700">{result.errors}</strong></span>
                      </div>
                    )}
                  </div>
                )}
                
                {result.details && result.details.length > 0 && (
                  <details className="mt-4">
                    <summary className="text-xs font-semibold text-mineral-taupe cursor-pointer hover:text-gold-vein">
                      Ver detalles técnicos
                    </summary>
                    <div className="mt-3 max-h-60 overflow-auto bg-stone-gray/30 rounded-lg p-4">
                      <ul className="text-xs space-y-1 font-mono">
                        {result.details.map((detail, i) => (
                          <li key={i} className="text-mineral-taupe">• {detail}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <SendButton 
            disabled={!canSend() || sending} 
            onClick={handleSendClick}
          />
        </div>
      </main>

      <ConfirmationModal
        show={showConfirmation}
        config={config}
        totalEmails={config.action === 'expensas' ? totalPDFs : totalUnidades}
        totalUnidades={totalUnidades}
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirmation(false)}
      />

      <SendingProgress
        show={sending}
        sent={sendingProgress.sent}
        total={sendingProgress.total}
        errors={sendingProgress.errors}
      />

      <TemplateEditor
        show={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
      />

      <ExcelDataViewer
        show={showExcelViewer}
        file={config.dataFile}
        onClose={() => setShowExcelViewer(false)}
      />

      <PDFValidator
        show={showPDFValidator}
        pdfFolder={config.pdfFolder}
        unidades={excelUnidades}
        onClose={() => setShowPDFValidator(false)}
      />

      <footer className="consorcio-footer">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-mineral-taupe">
            © 2025 Consorcio Expensas • Sistema de Notificaciones • MxrCabrera Dev
          </p>
        </div>
      </footer>
    </div>
  );
}