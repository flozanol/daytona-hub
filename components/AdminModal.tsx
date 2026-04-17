'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  actionText: string;
}

export default function AdminModal({ isOpen, onClose, onSubmit, actionText }: AdminModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === '') {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(pin);
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-6 mt-2">
          <div className="bg-red-50 p-3 rounded-full text-red-600 mb-3">
            <Lock size={24} />
          </div>
          <h3 className="text-xl font-black text-[#003366]">Acceso Restringido</h3>
          <p className="text-sm text-gray-500 text-center mt-1">
            Ingrese el PIN de administrador para {actionText}.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="••••"
              className={`w-full px-4 py-3 rounded-xl border bg-gray-50 text-center tracking-[0.5em] text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#003366] transition-all
                ${error ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200'}`}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 text-center mt-2 font-bold">Por favor ingrese el PIN.</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#003366] text-white font-bold py-3 rounded-xl hover:bg-[#002244] hover:shadow-lg transition-all active:scale-95"
          >
            Autorizar Acción
          </button>
        </form>
      </div>
    </div>
  );
}
