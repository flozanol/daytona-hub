// @ts-nocheck
'use client';

import { useState } from 'react';
import { Car, Key, Wrench, Megaphone, LayoutDashboard, Database, Zap, Target, ArrowRight } from 'lucide-react';

export default function DaytonaHub() {
  const [activeTab, setActiveTab] = useState('resumen');

  const dashboards = [
    { id: 'resumen', name: 'Centro de Comando', icon: LayoutDashboard },
    { id: 'nuevos', name: 'Autos Nuevos', url: 'https://flozanol.github.io/daytona-autos-nuevos-kpis/', icon: Car, status: 'Conectado (API Sheets)' },
    { id: 'seminuevos', name: 'Seminuevos', url: 'https://flozanol.github.io/daytona-seminuevos-kpis/', icon: Key, status: 'Conectado (API Sheets)' },
    { id: 'postventa', name: 'Postventa', url: 'https://daytona-postventa-kpis.vercel.app/', icon: Wrench, status: 'Conectado (CSV Hub)' },
    { id: 'marketing', name: 'Marketing', url: 'https://daytona-marketing-dashboard.vercel.app/', icon: Megaphone, status: 'Conectado (Supabase DB)' }
  ];

  const activeApp = dashboards.find(d => d.id === activeTab);

  return (
    <div className="flex flex-col h-screen w-full bg-[#F4F6F8] overflow-hidden font-sans antialiased">

      {/* BARRA SUPERIOR (TOP BAR) */}
      <header className="bg-[#003366] text-white shadow-lg z-20 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-3">

          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <img
              src="https://grupodaytona.com/_next/image?url=https%3A%2F%2Fapi.grupodaytona.com%2Ffiles%2Fimages%2Ffull-xzLxpZqXUE-1728519042236.png&w=384&q=75"
              alt="Daytona"
              className="w-32"
            />
            <div className="h-8 w-px bg-white/20 hidden md:block"></div>
            <div className="hidden md:flex items-center gap-2 text-white/90">
              <span className="font-bold tracking-widest text-sm uppercase">Business Intelligence Hub</span>
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {dashboards.map((app) => {
              const Icon = app.icon;
              const isActive = activeTab === app.id;

              return (
                <button
                  key={app.id}
                  onClick={() => setActiveTab(app.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                    ${isActive
                      ? 'bg-white text-[#003366] shadow-md scale-105'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon size={16} />
                  {app.name}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 w-full relative overflow-y-auto bg-gray-50">

        {/* PANTALLA DE BIENVENIDA EJECUTIVA */}
        {activeTab === 'resumen' ? (
          <div className="max-w-7xl mx-auto p-6 md:p-10 animate-in fade-in duration-500">

            <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-[#003366]"><LayoutDashboard size={180} /></div>
              <div className="relative z-10">
                <span className="bg-blue-50 text-[#003366] text-xs font-black uppercase px-3 py-1.5 rounded-full tracking-widest border border-blue-100">
                  FASE 1: Centralización Completada
                </span>
                <h1 className="text-4xl font-black text-[#003366] tracking-tight mt-4">Bienvenido al Portal de Inteligencia Daytona</h1>
                <p className="text-gray-600 font-medium mt-2 max-w-3xl leading-relaxed">
                  Hemos unificado el acceso a todos los módulos de datos del Grupo. Desde este panel superior, puede navegar instantáneamente entre los dashboards de Nuevos, Seminuevos, Postventa y Marketing, visualizando la información en vivo de cada área.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Target size={18} className="text-[#fd0019]" /> Acceso Instantáneo a Datos Reales
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboards.filter(d => d.id !== 'resumen').map(app => {
                  const Icon = app.icon;
                  return (
                    <div
                      key={app.id}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all cursor-pointer group"
                      onClick={() => setActiveTab(app.id)}
                    >
                      <div className="flex justify-between items-start mb-5">
                        <div className="bg-blue-50 p-3 rounded-xl text-[#003366]"><Icon size={22} /></div>
                        <ArrowRight size={20} className="text-gray-300 group-hover:text-[#fd0019] transition-colors" />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">{app.name}</h3>
                      <p className="text-xs font-bold text-emerald-600 mt-1.5 flex items-center gap-1.5">
                        <Database size={12} /> {app.status}
                      </p>
                      <p className="text-sm text-gray-500 mt-3 font-medium">Haga clic para ver el desglose detallado e interactivo.</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#003366] to-[#001a33] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-[#004080]">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: 'calc(10 * 1px) calc(10 * 1px)' }}></div>
              <div className="relative z-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-200 mb-6 flex items-center gap-2">
                  <Zap size={18} className="text-amber-400" /> Hoja de Ruta del Proyecto BI
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <span className="text-5xl">✅</span>
                    <h4 className="font-black text-lg mt-3">Fase 1</h4>
                    <p className="text-blue-100 text-sm mt-1">Centralizar 4 dashboards en 1 portal único.</p>
                  </div>
                  <div className="bg-white/10 p-6 rounded-xl border border-amber-300 scale-105 shadow-2xl">
                    <span className="text-5xl">🚀</span>
                    <h4 className="font-black text-lg mt-3 text-amber-300">Fase 2 (Siguiente)</h4>
                    <p className="text-amber-100 text-sm mt-1">Integración y Consolidación de KPIs Globales.</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-xl border border-white/10 opacity-60">
                    <span className="text-5xl">🤖</span>
                    <h4 className="font-black text-lg mt-3">Fase 3</h4>
                    <p className="text-blue-100 text-sm mt-1">Alertas Automáticas y Forecast con IA.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* MODO IFRAME (Carga el Dashboard Seleccionado que SÍ funciona) */
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4"></div>
              <p className="text-[#003366] font-bold text-sm tracking-widest uppercase">Cargando Módulo {activeApp?.name}...</p>
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
        )}
      </main>

    </div>
  );
}