'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RefreshCw, PieChart, FlaskConical, FileDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type KPIRow = { name: string } & Record<string, number>;
interface AgencyYear { agency: string; year: '2025' | '2026'; kpis: KPIRow[] }

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const KPI_TARGET = 'Unidades Facturadas';
const AVERAGE_KPIS = ['%','Utilidad','Margen','ROI','Efectivdad','Cierre','Absorción','Comisión','Penetración'];
const GROUP_SUM_KPIS = ['Inventario Total','Gasto Financiero','Valor Total'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
const isAvgKpi = (name: string) => AVERAGE_KPIS.some(a => name.includes(a));
const isGsKpi  = (name: string) => GROUP_SUM_KPIS.some(g => name.includes(g));

function agencyKpiValue(data: AgencyYear[], agency: string, kpi: string, months: string[]): number {
  let sum = 0, count = 0;
  data.filter(d => d.agency === agency).forEach(d => {
    const k = d.kpis.find(r => r.name === kpi);
    if (k) months.forEach(m => { const v = (k[m] as number) || 0; sum += v; if (v) count++; });
  });
  return isAvgKpi(kpi) && count > 0 ? sum / count : sum;
}

async function exportXlsx(rows: (string | number)[][], filename: string) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Table styles ─────────────────────────────────────────────────────────────

const thCls = 'bg-[#111827] text-white font-semibold p-3 text-xs sticky top-0 z-20 text-center';
const tdCls = 'border-b border-gray-200 p-2.5 text-sm text-gray-700 text-center';
const tdFirstCls = `${tdCls} sticky left-0 bg-gray-50 border-r-2 border-gray-200 text-left font-bold z-10`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardKPIs() {
  const [data25, setData25] = useState<AgencyYear[]>([]);
  const [data26, setData26] = useState<AgencyYear[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg]       = useState('');
  const [tick, setTick]           = useState(0);

  // Filters
  const [yearFilter, setYearFilter]   = useState<'2025' | '2026' | 'all'>('all');
  const [checkedAg, setCheckedAg]     = useState<Set<string>>(new Set());
  const [checkedMo, setCheckedMo]     = useState<Set<string>>(new Set(MONTHS));
  const [cmpMonth, setCmpMonth]       = useState(MONTHS[0]);
  const [cmpAgency, setCmpAgency]     = useState('');
  const [histAgency, setHistAgency]   = useState('');
  const [now]                         = useState(() => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));

  // Load / reload
  useEffect(() => {
    setLoadState('loading');
    fetch('/api/sheets')
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        const d25: AgencyYear[] = [], d26: AgencyYear[] = [];
        for (const ag of json.agencies) {
          d25.push({ agency: ag.agency, year: '2025', kpis: ag.kpis2025 });
          d26.push({ agency: ag.agency, year: '2026', kpis: ag.kpis2026 });
        }
        const ags = d25.map(d => d.agency).sort();
        setData25(d25); setData26(d26);
        setCheckedAg(new Set(ags));
        setCmpAgency(ags[0] ?? ''); setHistAgency(ags[0] ?? '');
        setLoadState('ready');
      })
      .catch(e => { setErrMsg(String(e)); setLoadState('error'); });
  }, [tick]);

  // Derived
  const allAgencies  = useMemo(() => data25.map(d => d.agency).sort(), [data25]);
  const activeAg     = useMemo(() => allAgencies.filter(a => checkedAg.has(a)), [allAgencies, checkedAg]);
  const activeMo     = useMemo(() => MONTHS.filter(m => checkedMo.has(m)), [checkedMo]);
  const rawData      = useMemo(() => {
    if (yearFilter === '2025') return data25;
    if (yearFilter === '2026') return data26;
    return [...data25, ...data26];
  }, [yearFilter, data25, data26]);
  const kpiNames     = useMemo(() => [...new Set(rawData.flatMap(d => d.kpis.map(k => k.name as string)))], [rawData]);

  // Top stats
  const stats = useMemo(() => {
    let total = 0;
    const agT: Record<string, number> = {}, moT: Record<string, number> = {};
    activeAg.forEach(ag => {
      agT[ag] = 0;
      rawData.filter(d => d.agency === ag).forEach(d => {
        const k = d.kpis.find(r => r.name === KPI_TARGET);
        if (k) activeMo.forEach(m => { const v = (k[m] as number) || 0; total += v; agT[ag] += v; moT[m] = (moT[m] || 0) + v; });
      });
    });
    const topA  = Object.keys(agT).reduce((a, b) => agT[a] > agT[b] ? a : b, '-');
    const bestM = Object.keys(moT).reduce((a, b) => moT[a] > moT[b] ? a : b, '-');
    return { total, topA, topAVal: agT[topA] || 0, bestM, avg: total / Math.max(activeMo.length, 1) };
  }, [rawData, activeAg, activeMo]);

  // Charts
  const trendData = useMemo(() => {
    const curM = new Date().getMonth();
    const out: { label: string; value: number }[] = [];
    MONTHS.forEach(m => {
      let s = 0;
      data25.forEach(d => { if (checkedAg.has(d.agency)) { const k = d.kpis.find(r => r.name === KPI_TARGET); s += k ? ((k[m] as number) || 0) : 0; } });
      out.push({ label: `${m.substring(0,3)} 25`, value: s });
    });
    MONTHS.forEach((m, i) => {
      if (i <= curM) {
        let s = 0;
        data26.forEach(d => { if (checkedAg.has(d.agency)) { const k = d.kpis.find(r => r.name === KPI_TARGET); s += k ? ((k[m] as number) || 0) : 0; } });
        out.push({ label: `${m.substring(0,3)} 26`, value: s });
      }
    });
    return out;
  }, [data25, data26, checkedAg]);

  const histChartData = useMemo(() => {
    const curM = new Date().getMonth();
    const out: { label: string; value: number }[] = [];
    MONTHS.forEach(m => {
      const d = data25.find(d => d.agency === histAgency);
      const k = d?.kpis.find(r => r.name === KPI_TARGET);
      out.push({ label: `${m.substring(0,3)} 25`, value: k ? ((k[m] as number) || 0) : 0 });
    });
    MONTHS.forEach((m, i) => {
      if (i <= curM) {
        const d = data26.find(d => d.agency === histAgency);
        const k = d?.kpis.find(r => r.name === KPI_TARGET);
        out.push({ label: `${m.substring(0,3)} 26`, value: k ? ((k[m] as number) || 0) : 0 });
      }
    });
    return out;
  }, [data25, data26, histAgency]);

  // Table builders
  const globalRows = useMemo(() => kpiNames.map(name => {
    let rowSum = 0, validAg = 0;
    const cells = activeAg.map(ag => {
      const val = agencyKpiValue(rawData, ag, name, activeMo);
      rowSum += val; if (val !== 0) validAg++;
      return val;
    });
    const total = (isAvgKpi(name) && !isGsKpi(name) && validAg > 0) ? rowSum / validAg : rowSum;
    return { name, cells, total, avg: validAg ? rowSum / validAg : 0 };
  }), [kpiNames, activeAg, rawData, activeMo]);

  const monthlyRows = useMemo(() => kpiNames.map(name => {
    let sum = 0;
    const cells = activeAg.map(ag => {
      let val = 0;
      rawData.filter(d => d.agency === ag).forEach(d => {
        const k = d.kpis.find(r => r.name === name);
        val += k ? ((k[cmpMonth] as number) || 0) : 0;
      });
      sum += val; return val;
    });
    return { name, cells, avg: sum / Math.max(activeAg.length, 1) };
  }), [kpiNames, activeAg, rawData, cmpMonth]);

  const yearCmpRows = useMemo(() => {
    const names = [...new Set(data25.flatMap(d => d.kpis.map(k => k.name as string)))];
    return names.map(name => {
      const d25r = data25.find(d => d.agency === cmpAgency)?.kpis.find(k => k.name === name);
      const d26r = data26.find(d => d.agency === cmpAgency)?.kpis.find(k => k.name === name);
      const v25 = d25r ? ((d25r[cmpMonth] as number) || 0) : 0;
      const v26 = d26r ? ((d26r[cmpMonth] as number) || 0) : 0;
      const diff = v26 - v25, pct = v25 !== 0 ? (diff / v25) * 100 : 0;
      return { name, v25, v26, diff, pct };
    });
  }, [data25, data26, cmpAgency, cmpMonth]);

  const { timeline, histRows } = useMemo(() => {
    const curM = new Date().getMonth();
    const tl: { m: string; y: '2025' | '2026'; label: string }[] = [];
    MONTHS.forEach(m => tl.push({ m, y: '2025', label: `${m.substring(0,3)} 25` }));
    MONTHS.forEach((m, i) => { if (i <= curM) tl.push({ m, y: '2026', label: `${m.substring(0,3)} 26` }); });
    const names = [...new Set(rawData.flatMap(d => d.kpis.map(k => k.name as string)))];
    const rows = names.map(name => ({
      name,
      cells: tl.map(t => {
        const ds = (t.y === '2025' ? data25 : data26).find(d => d.agency === histAgency);
        const k = ds?.kpis.find(r => r.name === name);
        return k ? ((k[t.m] as number) || 0) : 0;
      }),
    }));
    return { timeline: tl, histRows: rows };
  }, [rawData, data25, data26, histAgency]);

  const toggleAg = useCallback((ag: string) => {
    setCheckedAg(prev => { const s = new Set(prev); s.has(ag) ? s.delete(ag) : s.add(ag); return s; });
  }, []);
  const toggleMo = useCallback((m: string) => {
    setCheckedMo(prev => { const s = new Set(prev); s.has(m) ? s.delete(m) : s.add(m); return s; });
  }, []);

  // ─── Loading / Error states ─────────────────────────────────────────────────

  if (loadState === 'loading') return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fd0019]" />
      <p className="text-[#fd0019] font-bold text-sm tracking-widest uppercase">Conectando con Seminuevos...</p>
    </div>
  );

  if (loadState === 'error') return (
    <div className="m-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg font-bold text-sm">
      Error al conectar con Google Sheets: {errMsg}
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-100 min-h-full" style={{ fontFamily: 'Roboto, sans-serif' }}>

      {/* Dashboard header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-[#fd0019] text-white font-black p-2.5 rounded-xl shadow-lg text-lg">🚗</div>
            <div>
              <p className="text-[10px] font-black text-[#fd0019] uppercase tracking-widest leading-none mb-1">Grupo Daytona</p>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">DASHBOARD GERENCIAL</h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Autos Seminuevos</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right hidden sm:block mr-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">Última actualización</p>
              <p className="text-sm font-black text-gray-800 tracking-tighter mt-0.5">{now}</p>
            </div>
            <button
              onClick={() => setTick(t => t + 1)}
              className="bg-[#fd0019] hover:bg-[#c40013] text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-md flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={12} /> Actualizar
            </button>
            <Link href="/reporte-rotacion"
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-md flex items-center gap-2 transition-colors">
              <PieChart size={12} /> Reporte Rotación
            </Link>
            <Link href="/seminuevos-aut"
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-md flex items-center gap-2 transition-all">
              <FlaskConical size={12} /> Clínica Inventario
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Unidades Facturadas', value: fmt(stats.total), sub: 'Periodo Actual', icon: '🏷️' },
            { label: 'Agencia Líder', value: stats.topA, sub: `${fmt(stats.topAVal)} Unidades`, icon: '🏆' },
            { label: 'Mejor Mes', value: stats.bestM, sub: 'Pico de facturación', icon: '📅' },
            { label: 'Promedio Mensual', value: fmt(stats.avg), sub: 'Unidades x Mes', icon: '📈' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl shadow p-6 flex items-center justify-between group border-t-4 border-[#fd0019] hover:-translate-y-0.5 transition-transform">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">{c.label}</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter">{c.value}</h3>
                <p className="text-[10px] font-bold text-[#fd0019] mt-1 uppercase">{c.sub}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-2xl group-hover:bg-[#fd0019] transition-all">{c.icon}</div>
            </div>
          ))}
        </div>

        {/* Filters + Global KPI table */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-10">

          {/* Sidebar filters */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4">
              CONFIGURACIÓN Y FILTROS
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-2">Año de Datos</label>
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value as typeof yearFilter)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-[#fd0019]"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="all">Comparativo (Ambos años)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Agencias Visibles</label>
                  <div className="space-x-2">
                    <button onClick={() => setCheckedAg(new Set(allAgencies))} className="text-[9px] font-bold text-[#fd0019] uppercase">Todas</button>
                    <button onClick={() => setCheckedAg(new Set())} className="text-[9px] font-bold text-gray-400 uppercase">Ninguna</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allAgencies.map(ag => (
                    <label key={ag} className="flex items-center space-x-2 cursor-pointer p-1.5 rounded hover:bg-gray-100">
                      <input type="checkbox" checked={checkedAg.has(ag)} onChange={() => toggleAg(ag)}
                        className="rounded text-[#fd0019] focus:ring-[#fd0019]" />
                      <span className="text-gray-700 font-medium text-sm">{ag}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Meses</label>
                  <div className="space-x-2">
                    <button onClick={() => setCheckedMo(new Set(MONTHS))} className="text-[9px] font-bold text-[#fd0019] uppercase">Todos</button>
                    <button onClick={() => setCheckedMo(new Set())} className="text-[9px] font-bold text-gray-400 uppercase">Ninguno</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {MONTHS.map(m => (
                    <label key={m} className="flex items-center space-x-2 cursor-pointer p-1.5 rounded hover:bg-gray-100">
                      <input type="checkbox" checked={checkedMo.has(m)} onChange={() => toggleMo(m)}
                        className="rounded text-[#fd0019] focus:ring-[#fd0019]" />
                      <span className="text-gray-700 font-medium text-sm">{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Global KPI table + trend chart */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow p-6 border-t-4 border-[#fd0019]">
              <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase mb-6">Resumen Global Seminuevos</h2>

              <div className="mb-6">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tendencia Global</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} margin={{ bottom: 24 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={0} angle={-45} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#fd0019" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Matriz de KPIs Inteligente</h4>
                <button
                  onClick={() => exportXlsx(
                    [['KPI', ...activeAg, 'Total', 'Prom.'], ...globalRows.map(r => [r.name, ...r.cells, r.total, r.avg])],
                    'KPIs_Global'
                  )}
                  className="text-[10px] font-bold text-[#fd0019] uppercase hover:underline flex items-center gap-1"
                >
                  <FileDown size={11} /> Excel
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Los promedios respetan la naturaleza del KPI (Ratio vs Volumen).</p>
              <div className="overflow-auto max-h-96 rounded-lg">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className={`${thCls} bg-[#fd0019] sticky left-0 z-30 text-left`}>KPI</th>
                      {activeAg.map(ag => <th key={ag} className={thCls}>{ag}</th>)}
                      <th className={thCls}>Total</th>
                      <th className={thCls}>Prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalRows.map(r => (
                      <tr key={r.name}>
                        <td className={tdFirstCls}>{r.name}</td>
                        {r.cells.map((v, i) => <td key={i} className={tdCls}>{fmt(v)}</td>)}
                        <td className={`${tdCls} font-bold`}>{fmt(r.total)}</td>
                        <td className={`${tdCls} font-bold`}>{fmt(r.avg)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Comparativo Interanual */}
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-[#fd0019] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase">Comparativo Interanual (Mismo Mes)</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">Agencia:</label>
                <select value={cmpAgency} onChange={e => setCmpAgency(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#fd0019]">
                  {allAgencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">Mes:</label>
                <select value={cmpMonth} onChange={e => setCmpMonth(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#fd0019]">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button
                onClick={() => exportXlsx(
                  [['KPI', 'Total 2025', 'Total 2026', 'Var. Abs.', 'Var. %'],
                   ...yearCmpRows.map(r => [r.name, r.v25, r.v26, r.diff, `${r.pct.toFixed(1)}%`])],
                  'Comparativo_Interanual'
                )}
                className="text-[10px] font-bold text-[#fd0019] uppercase hover:underline flex items-center gap-1"
              ><FileDown size={11} /> Excel</button>
            </div>
          </div>
          <div className="overflow-auto max-h-[500px] rounded-lg">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={`${thCls} bg-[#fd0019] sticky left-0 z-30 text-left`}>KPI ({cmpMonth}) — {cmpAgency}</th>
                  <th className={thCls}>Total 2025</th>
                  <th className={thCls}>Total 2026</th>
                  <th className={thCls}>Var. Abs.</th>
                  <th className={thCls}>Var. %</th>
                </tr>
              </thead>
              <tbody>
                {yearCmpRows.map(r => (
                  <tr key={r.name}>
                    <td className={tdFirstCls}>{r.name}</td>
                    <td className={tdCls}>{fmt(r.v25)}</td>
                    <td className={tdCls}>{fmt(r.v26)}</td>
                    <td className={`${tdCls} font-bold ${r.diff > 0 ? 'text-green-600' : 'text-[#fd0019]'}`}>
                      {r.diff > 0 ? '+' : ''}{fmt(r.diff)}
                    </td>
                    <td className={`${tdCls} font-black ${r.diff > 0 ? 'text-green-600' : 'text-[#fd0019]'}`}>
                      {r.diff > 0 ? '+' : ''}{r.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparativo por Mes */}
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-[#fd0019] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase">Comparativo por Mes</h2>
            <button
              onClick={() => exportXlsx(
                [['KPI', ...activeAg, 'Prom.'],
                 ...monthlyRows.map(r => [r.name, ...r.cells, r.avg])],
                'Comparativo_Mes'
              )}
              className="text-[10px] font-bold text-[#fd0019] uppercase hover:underline flex items-center gap-1"
            ><FileDown size={11} /> Excel</button>
          </div>
          <div className="overflow-auto max-h-[500px] rounded-lg">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={`${thCls} bg-[#fd0019] sticky left-0 z-30 text-left`}>KPI ({cmpMonth})</th>
                  {activeAg.map(ag => <th key={ag} className={thCls}>{ag}</th>)}
                  <th className={thCls}>Prom.</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map(r => (
                  <tr key={r.name}>
                    <td className={tdFirstCls}>{r.name}</td>
                    {r.cells.map((v, i) => <td key={i} className={tdCls}>{fmt(v)}</td>)}
                    <td className={`${tdCls} font-bold`}>{fmt(r.avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico Agencia */}
        <div className="bg-white rounded-xl shadow p-6 border-t-4 border-[#fd0019] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tighter uppercase">Histórico Agencia</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tighter whitespace-nowrap">Agencia:</label>
                <select value={histAgency} onChange={e => setHistAgency(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#fd0019]">
                  {allAgencies.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                </select>
              </div>
              <button
                onClick={() => exportXlsx(
                  [['KPI', ...timeline.map(t => t.label)],
                   ...histRows.map(r => [r.name, ...r.cells])],
                  'Historico_Agencia'
                )}
                className="text-[10px] font-bold text-[#fd0019] uppercase hover:underline flex items-center gap-1"
              ><FileDown size={11} /> Excel</button>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Línea de Tiempo</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={histChartData} margin={{ bottom: 24 }}>
                <XAxis dataKey="label" tick={{ fontSize: 8 }} interval={0} angle={-45} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#fd0019" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-auto max-h-[500px] rounded-lg">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className={`${thCls} bg-[#fd0019] sticky left-0 z-30 text-left`}>KPI</th>
                  {timeline.map(t => <th key={t.label} className={thCls}>{t.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {histRows.map(r => (
                  <tr key={r.name}>
                    <td className={tdFirstCls}>{r.name}</td>
                    {r.cells.map((v, i) => <td key={i} className={tdCls}>{fmt(v)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-4">
        <p className="text-center text-xs text-gray-400 font-bold">&copy; 2026 Grupo Daytona | Business Intelligence</p>
      </footer>
    </div>
  );
}
