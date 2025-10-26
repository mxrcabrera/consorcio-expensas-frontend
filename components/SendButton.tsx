'use client';

import React from 'react';
import { Send } from 'lucide-react';

interface SendButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export default function SendButton({ disabled, onClick }: SendButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-send-consorcio w-full md:w-auto"
    >
      <Send className="w-5 h-5" />
      <span>Enviar Notificaciones</span>
    </button>
  );
}