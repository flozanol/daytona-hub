'use client';

import { useState } from 'react';
import ClinicaNuevosFinal from './ClinicaNuevosFinal';

export default function AutosNuevosWrapper({ activeApp }: { activeApp: any }) {
  const [subTab, setSubTab] = useState<'dashboard' | 'clinica'>('dashboard');

  return (
    <div className="flex flex-col w-full h-full">
      {/* Sub-navegación dentro de Autos Nuevos */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-4 shrink-0 shadow-sm z-20">
        <button
          onClick={() => setSubTab('dashboard')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'dashboard'
            ? 'bg-[#003366] text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          Dashboard KPIs
        </button>
        <button
          onClick={() => setSubTab('clinica')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'clinica'
            ? 'bg-[#003366] text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          Clínica de Inventario
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-50">
        {subTab === 'dashboard' ? (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4"></div>
              <p className="text-[#003366] font-bold text-sm tracking-widest uppercase">
                Cargando Módulo {activeApp?.name}...
              </p>
            </div>
            {activeApp?.url && (
              <iframe
                src={activeApp.url}
                title={activeApp.name}
                className="w-full h-full border-0 absolute inset-0 z-10 bg-transparent"
                allowFullScreen
              />
            )}
          </>
        ) : (
          <div className="w-full h-full overflow-y-auto bg-[#F8FAFC]">
            <ClinicaNuevosFinal />
          </div>
        )}
      </div>
    </div>
  );
}
