'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  placeholder = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}: ModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value || '';
    if (value.trim()) {
      onConfirm(value);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-5 h-5 text-mineral-taupe" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="modal-input"
          />

          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="modal-btn-cancel">
              {cancelText}
            </button>
            <button type="submit" className="modal-btn-confirm">
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}