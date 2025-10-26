'use client';

import React from 'react';
import { generateConfigCode } from '@/lib/utils';
import { ConfigState } from '@/types';
import TemplatePreview from './TemplatePreview';

interface ConfigSummaryProps {
  config: ConfigState;
}

export default function ConfigSummary({ config }: ConfigSummaryProps) {
  const configCode = generateConfigCode({
    action: config.action,
    testMode: config.testMode,
    month: config.month,
  });

  return (
    <div className="consorcio-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="card-title">Resumen de Configuración</h3>
        {config.action && config.action !== 'avisos_generales' && (
          <TemplatePreview actionType={config.action} />
        )}
      </div>

      <div className="space-y-1">
        <div className="summary-item">
          <span className="summary-label">Código de Formulación</span>
          <span className="summary-value font-mono">{configCode}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Tipo de Acción</span>
          <span className="summary-value">
            {config.action === 'expensas' && 'Envío de Expensas'}
            {config.action === 'corte_luz' && 'Aviso de Corte de Luz'}
            {config.action === 'avisos_generales' && 'Avisos Generales'}
            {!config.action && 'No seleccionado'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Modo</span>
          <span className="summary-value">
            {config.testMode ? `Prueba (${config.testEmail})` : 'Producción'}
          </span>
        </div>

        {config.action === 'expensas' && (
          <div className="summary-item">
            <span className="summary-label">Carpeta PDFs</span>
            <span className="summary-value font-mono text-xs">
              {config.pdfFolder || 'No especificado'}
            </span>
          </div>
        )}

        {config.action === 'corte_luz' && config.diasCorte && (
          <div className="summary-item">
            <span className="summary-label">Corte en</span>
            <span className="summary-value">
              {config.diasCorte} días
            </span>
          </div>
        )}

        {config.subject && (
          <div className="summary-item">
            <span className="summary-label">Asunto</span>
            <span className="summary-value truncate">
              {config.subject}
            </span>
          </div>
        )}

        <div className="summary-item">
          <span className="summary-label">Archivo de Datos</span>
          <span className="summary-value">
            {config.dataFile ? config.dataFile.name : 'No cargado'}
          </span>
        </div>
      </div>
    </div>
  );
}