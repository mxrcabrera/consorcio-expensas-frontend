'use client';

import React from 'react';
import { Mail } from 'lucide-react';

interface SubjectInputProps {
  subject: string;
  onChange: (subject: string) => void;
}

export default function SubjectInput({ subject, onChange }: SubjectInputProps) {
  return (
    <div className="config-section">
      <h3 className="config-label">Asunto del Email</h3>

      <div className="consorcio-card">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-mineral-taupe" />
          <label className="text-base font-semibold text-deep-stone">
            Personalizar asunto
          </label>
        </div>

        <input
          type="text"
          value={subject}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ingresá el asunto del correo"
          className="w-full px-4 py-3 rounded-xl border-2 border-mineral-taupe/20 
                   focus:border-gold-vein focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
}