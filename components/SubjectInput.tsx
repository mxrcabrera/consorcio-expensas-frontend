'use client';

import { Mail } from 'lucide-react';

interface SubjectInputProps {
  subject: string;
  onChange: (subject: string) => void;
}

export default function SubjectInput({ subject, onChange }: SubjectInputProps) {
  return (
    <div className="config-section">
      <div className="config-label">Asunto del Email</div>

      <div className="consorcio-card">
        <div className="form-label-group">
          <Mail className="form-icon" />
          <label className="form-label">Personalizar asunto</label>
        </div>

        <input
          type="text"
          value={subject}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ingresá el asunto del correo"
          className="email-subject-input"
        />
      </div>
    </div>
  );
}