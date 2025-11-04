'use client';

import { Mail } from 'lucide-react';

interface TestModeToggleProps {
  testMode: boolean;
  testEmail: string;
  onToggle: (enabled: boolean) => void;
  onEmailChange: (email: string) => void;
}

export default function TestModeToggle({
  testMode,
  testEmail,
  onToggle,
  onEmailChange,
}: TestModeToggleProps) {
  return (
    <div className="config-section">
      <div className="config-label">Modo de Prueba</div>

      <div className="consorcio-card">
        <div className="test-mode-header">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => onToggle(e.target.checked)}
            className="checkbox-large"
          />
          <div className="test-mode-content">
            <label className="test-mode-title">Activar modo de prueba</label>
            <p className="test-mode-description">
              Los correos se enviarán únicamente a la dirección especificada
            </p>
          </div>
        </div>

        {testMode && (
          <div className="test-mode-input-wrapper">
            <Mail className="form-icon" />
            <input
              type="email"
              value={testEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="correo@prueba.com"
              className="test-mode-input"
            />
          </div>
        )}
      </div>
    </div>
  );
}