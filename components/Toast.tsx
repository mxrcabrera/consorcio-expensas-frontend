'use client';

import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ show, message, type, onClose }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-6 right-6 z-100 animate-slide-in">
      <div className={`
        flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-2
        ${type === 'success' 
          ? 'bg-white border-gold-vein' 
          : 'bg-white border-red-400'
        }
      `}>
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center shrink-0
          ${type === 'success' 
            ? 'bg-gold-vein' 
            : 'bg-red-500'
          }
        `}>
          {type === 'success' ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <X className="w-5 h-5 text-white" />
          )}
        </div>
        
        <p className="font-medium text-deep-stone pr-4">{message}</p>
        
        <button
          onClick={onClose}
          className="p-1 hover:bg-stone-gray rounded transition-colors"
        >
          <X className="w-4 h-4 text-mineral-taupe" />
        </button>
      </div>
    </div>
  );
}