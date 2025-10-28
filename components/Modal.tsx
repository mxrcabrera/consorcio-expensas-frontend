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
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl border-2 border-mineral-taupe/20 shadow-2xl animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-mineral-taupe/10">
          <h3 className="text-2xl font-serif font-semibold text-deep-stone">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-gray transition-colors"
          >
            <X className="w-5 h-5 text-mineral-taupe" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-lg border-2 border-mineral-taupe/20 
                     focus:border-gold-vein focus:outline-none focus:ring-2 focus:ring-gold-vein/20 
                     transition-all text-deep-stone"
          />

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border-2 border-mineral-taupe/30 
                       hover:bg-stone-gray transition-colors text-deep-stone font-medium"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg transition-colors font-semibold shadow-md"
              style={{
                backgroundColor: '#C9B28E',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B89A6A'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C9B28E'}
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}