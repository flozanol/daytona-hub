'use client';

import { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, ReferenceLine,
} from 'recharts';

const scatterData = Array.from({ length: 180 }, () => {
  const stock = Math.floor(Math.random() * 180);
  const base  = 50000 - stock * 250;
  const noise = (Math.random() - 0.5) * 40000;
  return { x: stock, y: Math.round(base + noise) };
});

const agingData = [
  { range: '0-15',   util: 46700 },
  { range: '16-30',  util: 39200 },
  { range: '31-60',  util: 31000 },
  { range: '61-90',  util: 24500 },
  { range: '91-120', util: 19800 },
  { range: '120+',   util: 15595 },
];

const erosionData = [
  { day: 'Arribo', pct: 100 },
  { day: '15d',    pct: 98 },
  { day: '30d',    pct: 96 },
  { day: '45d',    pct: 93 },
  { day: '60d',    pct: 91 },
  { day: '90d',    pct: 87 },
];

const odysseyData = [
  { fecha: '02/Ene', precio: 498275 },
  { fecha: '05/Ene', precio: 503500 },
  { fecha: '12/Ene', precio: 459382 },
  { fecha: '19/Ene', precio: 450604 },
  { fecha: '27/Ene', precio: 443080 },
  { fecha: '03/Feb', precio: 443080 },
  { fecha: '09/Feb', precio: 447260 },
  { fecha: '16/Feb', precio: 430766 },
];

const AGING_COLORS = ['#10b981','#34d399','#fbbf24','#f59e0b','#ef4444','#b91c1c'];

export default function ReporteRotacion() {
  const [aiType, setAiType]       = useState<'summary' | 'strategy' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');

  function simulateAI(type: 'summary' | 'strategy') {
    setAiType(type); setAiLoading(true); setAiContent('');
    setTimeout(() => {
      setAiLoading(false);
      setAiContent(type === 'summary'
        ? '<h4 class="text-lg font-bold text-violet-900 mb-4 uppercase">Informe Ejecutivo</h4><p>El análisis del caso Odyssey demuestra que después de los 450 días, el activo ha perdido más del 25% de su valor recuperable. Urge liquidación para liberar capital.</p>'
        : '<h4 class="text-lg font-bold text-violet-900 mb-4 uppercase">Estrategia de Choque</h4><p>1. Ajustar precio a $425,000 (Líder de mercado). 2. Bono de $5k al asesor. 3. Remarketing digital agresivo de 48 horas.</p>'
      );
    }, 1500);
  }

  return (
    <div className="antialiased text-slate-800 bg-[#f1f5f9] min-h-full" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div className="text-white pt-10 pb-20 md:pt-12 md:pb-24 px-4 md:px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-white uppercase tracking-[0.3em] md:tracking-[0.5em]">GRUPO DAYTONA</h2>
          <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-4 px-2">Vender Rápido es Ganar Más</h1>
          <p className="text-blue-300 text-base md:text-xl max-w-3xl mx-auto font-light leading-relaxed px-4">
            Análisis de depreciación y flujo de capital.
            <span className="block mt-2 font-semibold text-white uppercase text-xs md:text-sm tracking-widest">Estrategia de Inventario 2026</span>
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-12 md:-mt-16">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-t-8 border-emerald-500">
            <span className="text-[10px] md:text-xs font-bold text-emerald-600 uppercase tracking-widest block text-center mb-2">Máximo Margen</span>
            <h3 className="text-4xl md:text-5xl font-black mt-2 text-slate-900 text-center">$46,700</h3>
            <p className="text-slate-500 mt-2 text-xs md:text-sm text-center font-medium">Utilidad Promedio (0-15 días)</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-t-8 border-rose-600 bg-rose-50">
            <span className="text-[10px] md:text-xs font-bold text-rose-600 uppercase tracking-widest block text-center mb-2">Punto de Inflexión</span>
            <h3 className="text-4xl md:text-5xl font-black mt-2 text-rose-700 text-center">$15,595</h3>
            <p className="text-rose-600 mt-2 text-xs md:text-sm text-center font-medium">Utilidad Promedio (120+ días)</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border-t-8 border-slate-900 bg-slate-900 text-white shadow-2xl">
            <span className="text-[10px] md:text-xs font-bold text-blue-400 uppercase tracking-widest block text-center mb-2">Destrucción de Valor</span>
            <h3 className="text-5xl md:text-6xl font-black mt-2 text-white text-center">-66%</h3>
            <p className="text-slate-400 mt-2 text-xs md:text-sm text-center font-semibold">Margen perdido por inactividad</p>
          </div>
        </div>

        {/* Scatter chart */}
        <section className="mb-8 md:mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">La &quot;Espiral de Pérdida&quot;</h2>
            <p className="text-slate-500 text-sm md:text-base mb-6">Evidencia visual: Cada día en patio evapora el margen.</p>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="x" name="Días en inventario" tick={{ fontSize: 11 }} label={{ value: 'Días en inventario', position: 'bottom', offset: 0, fontSize: 12 }} />
                <YAxis type="number" dataKey="y" name="Utilidad" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, n: string) => [n === 'x' ? `${v} días` : `$${v.toLocaleString()}`, n === 'x' ? 'Días' : 'Utilidad']} />
                <ReferenceLine x={0} stroke="transparent" />
                <ReferenceLine segment={[{x: 0, y: 50000},{x: 180, y: 0}]} stroke="#ef4444" strokeWidth={3} strokeDasharray="0" />
                <Scatter data={scatterData} fill="rgba(51,65,85,0.4)" />
              </ScatterChart>
            </ResponsiveContainer>
            <div className="mt-6 p-4 md:p-6 bg-amber-50 rounded-xl border-l-4 md:border-l-8 border-amber-400">
              <h4 className="font-bold text-amber-900 uppercase text-[10px] md:text-xs tracking-widest mb-2">Lectura de Gráfica</h4>
              <p className="text-xs md:text-sm text-amber-900 leading-relaxed italic">
                &ldquo;Observe cómo la densidad de puntos de alta utilidad desaparece después de los <strong>60 días</strong>. El tiempo no mejora el precio; solo aumenta el descuento necesario para vender.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* Bar + Line charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-bold mb-6 text-slate-900">Muerte del Margen por Edad</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={agingData}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Utilidad']} />
                <Bar dataKey="util" radius={[6,6,0,0]}>
                  {agingData.map((_, i) => <Cell key={i} fill={AGING_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-bold mb-6 text-slate-900">Erosión Inevitable de Mercado</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={erosionData}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[84, 101]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Valor de mercado']} />
                <Line type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategy battle */}
        <section className="bg-white rounded-2xl shadow-xl p-6 md:p-10 mb-8 md:mb-12 border-l-6 border-red-500" style={{ borderLeftWidth: 6 }}>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-8 uppercase text-center md:text-left">La Batalla de las Estrategias</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="p-6 md:p-8 bg-slate-50 rounded-3xl border-2 border-slate-200 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-slate-500 uppercase tracking-tighter">Gerente &quot;Conservador&quot;</h4>
                <span className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-full font-bold">Defiende Margen</span>
              </div>
              <p className="text-slate-600 mb-6 text-sm md:text-base leading-relaxed">
                Compra un auto de <strong>$400,000</strong>. No quiere &ldquo;perderle&rdquo; y espera <strong>4 meses</strong> hasta encontrar al cliente que pague el precio completo.
              </p>
              <ul className="space-y-4 flex-grow mb-8 text-sm">
                <li className="flex justify-between"><span>Utilidad Bruta Única:</span><span className="font-bold text-slate-800">+$50,000</span></li>
                <li className="flex justify-between text-xs text-rose-500 italic"><span>(-) Costos mantenimiento (4 meses):</span><span>-$18,000</span></li>
                <li className="flex justify-between text-xs text-rose-500 italic"><span>(-) Costo financiero capital:</span><span>-$24,000</span></li>
              </ul>
              <div className="pt-6 border-t border-slate-200">
                <p className="text-xs uppercase text-slate-400 font-bold mb-1">Utilidad Final Real:</p>
                <p className="text-4xl font-black text-slate-800">$8,000 <span className="text-xs text-slate-400">MXN</span></p>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-blue-50 rounded-3xl border-2 border-blue-200 flex flex-col relative overflow-hidden shadow-lg scale-105 z-10">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-xl font-bold text-blue-700 uppercase tracking-tighter">Gerente &quot;Dinámico&quot;</h4>
                <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">Prioriza Rotación</span>
              </div>
              <p className="text-slate-600 mb-6 text-sm md:text-base leading-relaxed">
                Usa los mismos <strong>$400,000</strong>. Vende el auto en <strong>30 días</strong> ajustando el precio rápido. Compra otro inmediatamente y repite 4 veces.
              </p>
              <ul className="space-y-4 flex-grow mb-8 text-sm">
                <li className="flex justify-between"><span>Utilidad por Venta (Promedio):</span><span className="font-bold text-blue-700">+$35,000</span></li>
                <li className="flex justify-between font-bold border-b border-blue-100 pb-2"><span>Número de Ventas (4 meses):</span><span>x4 Unidades</span></li>
              </ul>
              <div className="pt-6 border-t border-blue-200">
                <p className="text-xs uppercase text-blue-400 font-bold mb-1">Utilidad Final Real:</p>
                <p className="text-4xl font-black text-blue-700">$140,000 <span className="text-xs text-blue-400">MXN</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* Honda Odyssey case */}
        <section className="mb-12 md:mb-20">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border-2 border-red-200">
            <div className="flex items-center mb-6 md:mb-8">
              <div className="bg-red-600 p-2 md:p-3 rounded-xl mr-4 md:mr-5 shadow-lg text-white text-xl">⚠️</div>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-red-900 uppercase tracking-tight">Caso Real Crítico: El Costo del Tiempo</h2>
                <p className="text-sm text-red-600 font-medium">Honda Odyssey — Análisis de 458 días en inventario</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Costo Original', val: '$520,000', cls: 'bg-slate-50 border-slate-200 text-slate-800' },
                { label: 'Costo Financiero (9.25%)', val: '-$60,373', sub: 'Acumulado 458 días', cls: 'bg-blue-50 border-blue-200 text-blue-800' },
                { label: 'Valor Sugerido Actual', val: '$430,766', sub: 'Última actualización feb-26', cls: 'bg-orange-50 border-orange-200 text-orange-800' },
                { label: 'Pérdida Total Real', val: '-$149,607', sub: 'Margen Perdido + Financiero', cls: 'bg-red-900 border-red-700 text-white' },
              ].map(c => (
                <div key={c.label} className={`border rounded-xl p-4 text-center ${c.cls}`}>
                  <p className="text-xs uppercase font-bold mb-1 opacity-70">{c.label}</p>
                  <p className="text-2xl font-black">{c.val}</p>
                  {c.sub && <p className="text-[10px] mt-1 opacity-60">{c.sub}</p>}
                </div>
              ))}
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-700 mb-4 uppercase tracking-wide">Línea de Degradación de Precio (Ene-Feb 2026)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={odysseyData} margin={{ left: 20, right: 20 }}>
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis domain={[420000, 510000]} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Precio sugerido']} />
                  <Line type="monotone" dataKey="precio" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-6 text-center">
              <p className="text-red-400 font-bold uppercase text-xs tracking-widest mb-2">Conclusión Financiera</p>
              <p className="text-lg md:text-xl font-black mb-2">Mantener este auto ha costado <span className="text-red-400">$326 pesos diarios</span>.</p>
              <p className="text-slate-300 text-sm">Cada mes que pasa sin venderse, se pierden aproximadamente <strong className="text-orange-300">$9,800 MXN</strong> solo en depreciación y costo financiero.</p>
            </div>
          </div>
        </section>

        {/* AI Consultant */}
        <section className="mb-12 md:mb-20">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border-2 border-violet-200"
            style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #ddd6fe' }}>
            <div className="flex items-center mb-6 md:mb-8">
              <div className="bg-violet-600 p-2 md:p-3 rounded-xl mr-4 md:mr-5 shadow-lg text-white text-xl">⚡</div>
              <div>
                <h2 className="text-xl md:text-3xl font-black text-violet-900 uppercase tracking-tight">Consultor Inteligente ✨</h2>
                <p className="text-violet-700 text-sm md:text-lg">Análisis estratégico inmediato (Simulación IA).</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button onClick={() => simulateAI('summary')}
                className="bg-violet-600 hover:bg-violet-700 text-white font-black py-4 md:py-5 px-6 rounded-2xl shadow-xl transition-all text-sm md:text-lg">
                Conclusión Gerencial ✨
              </button>
              <button onClick={() => simulateAI('strategy')}
                className="bg-white hover:bg-violet-50 text-violet-700 border-2 border-violet-300 font-black py-4 md:py-5 px-6 rounded-2xl shadow-md transition-all text-sm md:text-lg">
                Tácticas Inmediatas ✨
              </button>
            </div>
            {aiType && (
              <div>
                {aiLoading
                  ? <div className="flex flex-col items-center py-8">
                      <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                      <p className="mt-4 text-violet-600 font-bold text-xs uppercase tracking-widest text-center">Analizando Datos del Historial...</p>
                    </div>
                  : <div className="bg-white p-6 md:p-10 rounded-2xl border border-violet-100 text-slate-700 text-sm md:text-base leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: aiContent }} />
                }
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="text-center pb-12 text-slate-400 text-[10px] md:text-xs border-t border-slate-200 mt-10 pt-10">
        <h4 className="font-bold tracking-widest mb-2 uppercase">Grupo Daytona</h4>
        <p>Análisis de Datos &amp; Flujo de Capital &copy; 2026</p>
      </footer>
    </div>
  );
}
