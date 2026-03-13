'use client';

import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ show, message, type, onClose }: ToastProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onCloseRef.current(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="toast-container">
      <div className={`toast-card ${type === 'success' ? 'toast-card-success' : 'toast-card-error'}`}>
        <div className={`toast-icon ${type === 'success' ? 'toast-icon-success' : 'toast-icon-error'}`}>
          {type === 'success' ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <X className="w-5 h-5 text-white" />
          )}
        </div>

        <p className="toast-message">{message}</p>

        <button onClick={onClose} className="toast-close-btn">
          <X className="w-4 h-4 text-mineral-taupe" />
        </button>
      </div>
    </div>
  );
}
