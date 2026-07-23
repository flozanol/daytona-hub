'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, FlaskConical } from 'lucide-react';

interface SeminuevosWrapperProps {
  src: string;
}

export function SeminuevosWrapper({ src }: SeminuevosWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloading, setReloading] = useState(false);

  const handleRefresh = () => {
    if (!iframeRef.current || reloading) return;
    setReloading(true);
    iframeRef.current.src = src;
    setTimeout(() => setReloading(false), 1200);
  };

  return (
    <div className="p-4 md:p-6 w-full h-full flex flex-col gap-3">

      {/* ── Barra de acciones del hub (fuera del iframe) ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleRefresh}
          disabled={reloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw size={13} className={reloading ? 'animate-spin' : ''} />
          Actualizar
        </button>

        <Link
          href="/seminuevos-aut"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#003366] text-white hover:bg-[#002244] transition-colors shadow-sm"
        >
          <FlaskConical size={13} />
          Clínica Inventario
        </Link>
      </div>

      {/* ── Iframe del dashboard externo ── */}
      <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 min-h-[80vh]">
        <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4" />
          <p className="text-[#003366] font-bold text-sm tracking-widest uppercase">
            Cargando Seminuevos...
          </p>
        </div>
        <iframe
          ref={iframeRef}
          src={src}
          title="Dashboard Seminuevos"
          className="w-full flex-1 border-none"
          allowFullScreen
        />
      </div>
    </div>
  );
}
