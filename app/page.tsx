// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Car, Key, Wrench, Megaphone, LayoutDashboard, Activity, ArrowRight } from 'lucide-react';

export default function DaytonaHub() {
  const [activeTab, setActiveTab] = useState('resumen');

  const [loadingDatos, setLoadingDatos] = useState(true);
  const [totales, setTotales] = useState({
    postventa: 0,
    nuevos: 0,
    seminuevos: 0
  });

  // Credenciales Maestras extraídas de tu código
  const API_KEY = "AIzaSyATBI8jMV1AtfsjhmwEwfOMYSdKmhMM5ck";
  const ID_NUEVOS = "1SeZxO6ggsUUS_bsI_XWYv-RGLe1lyHNhMrppAXSBR9Y";
  const ID_SEMINUEVOS = "1r3_CS8eu9MQz6Zwx0x95xwrHb-xSw1-R7m1aqsEAcQQ";
  const URL_POSTVENTA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwcS4mh6qN2rqhcrnuBEssd5GIsEiXAp242OuqK9tuxEZfR_xRRJszCRbiDTUJIzbOwpkJpa4kqI4_/pub?gid=1096001978&single=true&output=csv";

  const dashboards = [
    { id: 'resumen', name: 'Resumen Global', icon: LayoutDashboard },
    { id: 'nuevos', name: 'Autos Nuevos', url: 'https://flozanol.github.io/daytona-autos-nuevos-kpis/', icon: Car },
    { id: 'seminuevos', name: 'Seminuevos', url: 'https://flozanol.github.io/daytona-seminuevos-kpis/', icon: Key },
    { id: 'postventa', name: 'Postventa', url: 'https://daytona-postventa-kpis.vercel.app/', icon: Wrench },
    { id: 'marketing', name: 'Marketing', url: 'https://daytona-marketing-dashboard.vercel.app/', icon: Megaphone }
  ];

  // 1. Limpiador Inmortal
  const limpiarNumero = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const num = Number(String(val).replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    const cargarDatosGlobales = async () => {
      setLoadingDatos(true);

      try {
        let sumPostventa = 0;
        let sumNuevos = 0;
        let sumSeminuevos = 0;

        // --- CEREBRO 1: LECTOR CSV DE POSTVENTA ---
        const fetchPostventa = new Promise((resolve) => {
          Papa.parse(URL_POSTVENTA_CSV, {
            download: true,
            header: true,
            complete: (results) => {
              const data = results.data || [];
              sumPostventa = data.filter(d => d.KPI === 'Venta Total').reduce((sum, item) => sum + limpiarNumero(item.Valor), 0);
              resolve();
            },
            error: () => resolve()
          });
        });

        // --- CEREBRO 2: LECTOR API GOOGLE (NUEVOS) ---
        const fetchNuevos = async () => {
          try {
            const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID_NUEVOS}?key=${API_KEY}`);
            const meta = await metaRes.json();
            // Filtramos solo las hojas de 2026
            const sheets2026 = meta.sheets.map(s => s.properties.title).filter(name => name.endsWith(' 26') || name.includes(' 26'));

            for (const sheetName of sheets2026) {
              const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID_NUEVOS}/values/${encodeURIComponent(sheetName + '!A:Z')}?key=${API_KEY}`);
              const json = await res.json();
              if (json.values && json.values.length > 0) {
                const rowUnidades = json.values.find(row => row.some(cell => cell && cell.toString().includes('Unidades Facturadas')));
                if (rowUnidades) {
                  for (let i = 1; i < rowUnidades.length; i++) {
                    sumNuevos += limpiarNumero(rowUnidades[i]);
                  }
                }
              }
            }
          } catch (e) { console.error("Error API Nuevos", e); }
        };

        // --- CEREBRO 3: LECTOR API GOOGLE (SEMINUEVOS) ---
        const fetchSeminuevos = async () => {
          try {
            const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID_SEMINUEVOS}?key=${API_KEY}`);
            const meta = await metaRes.json();
            const sheetNames = meta.sheets.map(s => s.properties.title).filter(t => !['Resumen', 'Dashboard', 'Config', 'Data'].includes(t));

            for (const name of sheetNames) {
              const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${ID_SEMINUEVOS}/values/${encodeURIComponent(name + '!A:Z')}?key=${API_KEY}`);
              const json = await res.json();
              if (json.values && json.values.length > 0) {
                const rowUnidades = json.values.find(row => row.some(cell => cell && cell.toString().includes('Unidades Facturadas')));
                if (rowUnidades) {
                  for (let i = 13; i <= 24; i++) {
                    if (rowUnidades[i]) sumSeminuevos += limpiarNumero(rowUnidades[i]);
                  }
                }
              }
            }
          } catch (e) { console.error("Error API Seminuevos", e); }
        };

        // Ejecutar los 3 cerebros en paralelo
        await Promise.all([fetchPostventa, fetchNuevos(), fetchSeminuevos()]);

        setTotales({
          postventa: sumPostventa,
          nuevos: sumNuevos,
          seminuevos: sumSeminuevos
        });

      } catch (error) {
        console.error("Error global de consolidación:", error);
      }

      setLoadingDatos(false);
    };

    cargarDatosGlobales();
  }, []);

  const activeApp = dashboards.find(d => d.id === activeTab);

  // Formateadores visuales
  const formatMoney = (val) => '$' + val.toLocaleString('es-MX', { maximumFractionDigits: 0 });
  const formatUnits = (val) => val.toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' Unidades';

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
              <span className="font-bold tracking-widest text-sm uppercase">C-Level Hub</span>
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
      <main className="flex-1 w-full relative overflow-y-auto">

        {/* PANTALLA DE RESUMEN EJECUTIVO */}
        {activeTab === 'resumen' ? (
          <div className="max-w-7xl mx-auto p-6 md:p-10 animate-in fade-in duration-500">

            <div className="mb-8 border-b border-gray-200 pb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-[#003366] tracking-tight">Consolidado 2026</h1>
                <p className="text-gray-500 font-medium mt-1">Sumatoria global extraída en tiempo real de las bases de datos de Grupo Daytona.</p>
              </div>
              <div className="bg-blue-50 text-blue-800 text-xs font-black uppercase px-4 py-2 rounded-lg tracking-widest border border-blue-100 hidden sm:block">
                LIVE DATA SYNC
              </div>
            </div>

            {loadingDatos ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#003366] mb-4"></div>
                <p className="text-[#003366] font-bold tracking-widest uppercase text-sm">Escaneando Hojas de Cálculo...</p>
                <p className="text-gray-400 text-xs mt-2">Conectando a las APIs Oficiales de Daytona</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

                  {/* Tarjeta Autos Nuevos */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('nuevos')}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Car size={24} /></div>
                      <ArrowRight size={20} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Autos Nuevos Facturados</p>
                    <h3 className="text-4xl font-black text-gray-800 mt-2 tracking-tighter">
                      {totales.nuevos > 0 ? formatUnits(totales.nuevos) : '0'}
                    </h3>
                    <div className="absolute -bottom-6 -right-6 text-blue-50 opacity-40 group-hover:scale-110 transition-transform duration-500"><Car size={140} /></div>
                  </div>

                  {/* Tarjeta Seminuevos */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('seminuevos')}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Key size={24} /></div>
                      <ArrowRight size={20} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Seminuevos Facturados</p>
                    <h3 className="text-4xl font-black text-gray-800 mt-2 tracking-tighter">
                      {totales.seminuevos > 0 ? formatUnits(totales.seminuevos) : '0'}
                    </h3>
                    <div className="absolute -bottom-6 -right-6 text-indigo-50 opacity-40 group-hover:scale-110 transition-transform duration-500"><Key size={140} /></div>
                  </div>

                  {/* Tarjeta Postventa */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('postventa')}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><Wrench size={24} /></div>
                      <ArrowRight size={20} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                    </div>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ingreso Postventa Histórico</p>
                    <h3 className="text-4xl font-black text-gray-800 mt-2 tracking-tighter">{formatMoney(totales.postventa)}</h3>
                    <div className="absolute -bottom-6 -right-6 text-emerald-50 opacity-40 group-hover:scale-110 transition-transform duration-500"><Wrench size={140} /></div>
                  </div>

                  {/* Tarjeta Marketing */}
                  <div className="bg-gradient-to-br from-[#002244] to-[#000a14] p-6 rounded-2xl shadow-lg border border-[#003366] relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('marketing')}>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="bg-white/10 p-3 rounded-xl text-blue-300"><Megaphone size={24} /></div>
                      <span className="bg-[#fd0019] text-white text-[9px] font-black uppercase px-2 py-1 rounded tracking-widest shadow-sm">Live System</span>
                    </div>
                    <p className="text-[11px] font-black text-blue-200/60 uppercase tracking-widest relative z-10">Marketing Digital</p>
                    <h3 className="text-2xl font-black text-white mt-2 leading-tight relative z-10 tracking-tight">Acceder al<br />Dashboard <ArrowRight size={20} className="inline ml-1 text-[#fd0019]" /></h3>
                    <div className="absolute -bottom-6 -right-6 text-white/5 group-hover:scale-110 transition-transform duration-500"><Activity size={140} /></div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#003366] to-[#002244] rounded-2xl shadow-lg p-8 text-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-10"><LayoutDashboard size={250} /></div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-3 tracking-tight">Portal Corporativo V2.0</h2>
                    <p className="text-blue-200 max-w-2xl mx-auto font-medium text-sm leading-relaxed">
                      El sistema ha consolidado la información de <strong>todas las agencias</strong> conectándose de manera segura a la API oficial de Google Workspace y al repositorio histórico de Postventa. Seleccione una unidad de negocio en la parte superior para visualizar el desglose detallado a nivel sucursal.
                    </p>
                  </div>
                </div>
              </>
            )}

          </div>
        ) : (
          /* MODO IFRAME (Carga el Dashboard Seleccionado) */
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