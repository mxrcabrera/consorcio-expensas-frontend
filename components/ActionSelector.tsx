'use client';

import { FileText, Zap, Bell, Check } from 'lucide-react';
import { ActionType, ActionConfig } from '@/types';

interface ActionSelectorProps {
  selectedAction: ActionType;
  onSelect: (action: ActionType) => void;
}

const ACTIONS: ActionConfig[] = [
  {
    id: 'expensas',
    icon: FileText,
    code: 'EXP',
    title: 'Envío de Expensas',
    description: 'Envía liquidaciones mensuales con PDFs adjuntos',
  },
  {
    id: 'corte_luz',
    icon: Zap,
    code: 'LUZ',
    title: 'Aviso de Corte de Luz',
    description: 'Notifica cortes programados de energía eléctrica',
  },
  {
    id: 'avisos_generales',
    icon: Bell,
    code: 'GEN',
    title: 'Avisos Generales',
    description: 'Envía comunicados generales del consorcio',
  },
];

export default function ActionSelector({ selectedAction, onSelect }: ActionSelectorProps) {
  return (
    <div className="config-section">
      <div className="config-label">1. ¿Qué querés enviar?</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const isSelected = selectedAction === action.id;

          return (
            <button
              key={action.id}
              onClick={() => onSelect(action.id)}
              className={`action-option ${isSelected ? 'action-option-selected' : ''}`}
            >
              {isSelected && (
                <div className="check-icon">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="action-header">
                <Icon className="action-icon" />
                <span className={`action-code ${isSelected ? 'action-code-selected' : 'action-code-default'}`}>
                  {action.code}
                </span>
              </div>

              <div>
                <h4 className="action-label">{action.title}</h4>
                <p className="action-desc">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}