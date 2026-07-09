'use client';

import { useState } from 'react';
import ClinicaInventarioFinalV4 from './ClinicaInventarioFinalV4';

interface AutosNuevosWrapperProps {
  dashboardUrl: string;
}

export function AutosNuevosWrapper({ dashboardUrl }: AutosNuevosWrapperProps) {
  const [subTab, setSubTab] = useState<'dashboard' | 'clinica'>('dashboard');

  return (
    <div className="flex flex-col w-full h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex gap-4 shrink-0 shadow-sm z-20">
        {(['dashboard', 'clinica'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              subTab === tab
                ? 'bg-[#003366] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'dashboard' ? 'Dashboard KPIs' : 'Clínica de Inventario'}
          </button>
        ))}
      </div>

      <div className="flex-1 relative w-full h-full overflow-hidden bg-gray-50">
        {subTab === 'dashboard' ? (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4" />
              <p className="text-[#003366] font-bold text-sm tracking-widest uppercase">
                Cargando Dashboard KPIs...
              </p>
            </div>
            <iframe
              src={dashboardUrl}
              title="Dashboard Autos Nuevos"
              className="w-full h-full border-0 absolute inset-0 z-10 bg-transparent"
              allowFullScreen
            />
          </>
        ) : (
          <div className="w-full h-full overflow-y-auto bg-[#F8FAFC]">
            <ClinicaInventarioFinalV4 />
          </div>
        )}
      </div>
    </div>
  );
}
