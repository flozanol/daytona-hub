'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Database, TrendingUp, Filter, Clock, BadgeDollarSign,
  Car, BarChart3, AlertTriangle, Download, Mail, Trophy, Bell,
  Skull, FileSpreadsheet,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { TASA_ANUAL, CPNY_MAP } from '../../lib/constants';

const CATS_OPCIONES = ['FINANCIADO', 'PROPIO', 'DEMO', 'DEMO PROPIO'];

const getCategoryBadge = (cat: string) => {
  const base = 'px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-widest';
  switch (cat) {
    case 'DEMO PROPIO': return <span className={`${base} bg-pink-100 text-pink-800 border-pink-200`}>{cat}</span>;
    case 'DEMO':        return <span className={`${base} bg-purple-100 text-purple-800 border-purple-200`}>{cat}</span>;
    case 'PROPIO':      return <span className={`${base} bg-amber-100 text-amber-800 border-amber-200`}>{cat}</span>;
    case 'FINANCIADO':  return <span className={`${base} bg-blue-100 text-blue-800 border-blue-200`}>{cat}</span>;
    default:            return <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>{cat}</span>;
  }
};

const getAgingColor = (dias: number): { bg: string; badge: string } => {
  if (dias <= 30) return { bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800 border-green-200' };
  if (dias <= 60) return { bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (dias <= 90) return { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800 border-orange-200' };
  return          { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800 border-red-200' };
};

const exportToExcel = (rows: Record<string, unknown>[], filename: string) => {
  const exportData = rows.map(r => ({
    'Sucursal':          r['Sucursal'],
    'Año Modelo':        r['Anio'] || 'N/A',
    'Modelo':            r['Modelo'],
    'Versión':           r['Versión'],
    'VIN':               r['VIN'],
    'Color':             r['Color'],
    'Categoría':         r['Categoría'],
    'Días':              r['Días'],
    'Costo Auto':        r['Costo'],
    'Costo Financiero':  r['CostoFinanciero'],
    'Inversión Total':   r['InversionTotal'],
  }));
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const FilterMultiCat = ({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
}) => {
  const colorMap: Record<string, string> = {
    'FINANCIADO':  'bg-blue-100 text-blue-800 border-blue-300',
    'PROPIO':      'bg-amber-100 text-amber-800 border-amber-300',
    'DEMO':        'bg-purple-100 text-purple-800 border-purple-300',
    'DEMO PROPIO': 'bg-pink-100 text-pink-800 border-pink-300',
  };
  const toggle = (cat: string) => {
    onChange(selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {CATS_OPCIONES.map(cat => {
        const active = selected.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black border uppercase tracking-widest transition-all ${
              active ? colorMap[cat] : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};

export default function ClinicaInventarioFinalV4() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedAgencias, setSelectedAgencias] = useState<string[]>([]);
  const [selectedAnios, setSelectedAnios]       = useState<string[]>([]);
  const [catsMuro, setCatsMuro]   = useState<string[]>([]);
  const [catsTabla, setCatsTabla] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/inventario', { cache: 'no-store' })
      .then(r => r.json())
      .then((sqlData: Record<string, unknown>[]) => {
        const mapeado = sqlData
          .filter(row => row['BrandDescr'] !== 'OTRO')
      .map((row, idx) => {
            const idRaw = String(row['CpnyID'] ?? '').trim().toUpperCase();
            const info  = CPNY_MAP[idRaw];
            const ubiText = String(row['Ubicacion'] ?? '').toUpperCase();
            const qtyAD = Number(row['QtyAD']) || 0;
            const qtyAF = Number(row['QtyAF']) || 0;
            const qtyAP = Number(row['QtyAP']) || 0;
            const qtyDP = Number(row['QtyDP']) || 0;

            let categoria = 'FINANCIADO';
            if (qtyDP > 0 || ubiText.includes('DEMO PROPIO'))  categoria = 'DEMO PROPIO';
            else if (qtyAD > 0 || ubiText.includes('DEMO'))    categoria = 'DEMO';
            else if (qtyAP > 0)                                 categoria = 'PROPIO';

            const costoFinal =
              categoria === 'DEMO'       ? Number(row['CostAD']) || 0 :
              categoria === 'PROPIO'     ? Number(row['CostAP']) || 0 :
              categoria === 'DEMO PROPIO'? Number(row['CostDP']) || 0 :
                                           Number(row['CostAF']) || 0;

            const costo = Number(costoFinal) || 0;
            const dias  = Number(row['Antiguedad']) || 0;
            const costoFinancieroAcumulado = (costo * TASA_ANUAL / 360) * dias;

            return {
              ...row,
              id: `sql-${idx}`,
              Sucursal: info ? info.nombre : `ID: ${idRaw}`,
              Sector:   info ? info.sector : 'DESCONOCIDO',
              VIN: row['VIN'] || 'N/A',
              Categoría: categoria,
              Costo: costo,
              CostoFinanciero: costoFinancieroAcumulado,
              InversionTotal: costo + costoFinancieroAcumulado,
              Versión: row['Version'],
              Días: dias,
            };
          })

        setData(mapeado);
        setIsLoaded(true);
      })
      .catch(err => console.error('Error al conectar con SQL Daytona:', err));
  }, []);

  const agenciasEnInventario = useMemo(() => {
    const únicas = [...new Set(data.map(d => d['Sucursal'] as string))];
    return {
      autos: únicas.filter(n => Object.values(CPNY_MAP).some(v => v.nombre === n && v.sector === 'AUTOS')).sort(),
      motos: únicas.filter(n => Object.values(CPNY_MAP).some(v => v.nombre === n && v.sector === 'MOTOS')).sort(),
    };
  }, [data]);

  const aniosUnicos = useMemo(() =>
    [...new Set(data.map(d => String(d['Anio'] || '')))]
      .filter(a => a && a !== 'undefined' && a !== 'null')
      .sort((a, b) => Number(b) - Number(a)),
    [data]
  );

  const toggleAgencia = (ag: string) =>
    setSelectedAgencias(p => p.includes(ag) ? p.filter(a => a !== ag) : [...p, ag]);

  const toggleAnio = (anio: string) =>
    setSelectedAnios(p => p.includes(anio) ? p.filter(a => a !== anio) : [...p, anio]);

  const dashboardData = useMemo(() => {
    let curr = data;
    if (selectedAgencias.length > 0) curr = curr.filter(d => selectedAgencias.includes(d['Sucursal'] as string));
    if (selectedAnios.length > 0)    curr = curr.filter(d => selectedAnios.includes(String(d['Anio'] || '')));
    return curr;
  }, [data, selectedAgencias, selectedAnios]);

  const stats = useMemo(() => {
    let totInversion = 0, totPropio = 0, totFin = 0, totDem = 0, totDemProp = 0, totCostoFin = 0;
    dashboardData.forEach(d => {
      const costo = Number(d['Costo']) || 0;
      totInversion += costo;
      totCostoFin  += Number(d['CostoFinanciero']) || 0;
      if (d['Categoría'] === 'PROPIO')     totPropio  += costo;
      if (d['Categoría'] === 'FINANCIADO') totFin     += costo;
      if (d['Categoría'] === 'DEMO')       totDem     += costo;
      if (d['Categoría'] === 'DEMO PROPIO')totDemProp += costo;
    });

    const baseMuro = dashboardData.filter(d => (d['Días'] as number) > 90);
    const muro     = catsMuro.length > 0 ? baseMuro.filter(d => catsMuro.includes(d['Categoría'] as string)) : baseMuro;

    return {
      unidades: new Intl.NumberFormat('en-US').format(dashboardData.length),
      inversion: totInversion,
      costoFinancieroTotal: totCostoFin,
      capitalPropio: totPropio + totDemProp,
      financiado: totFin,
      propio: totPropio,
      demo: totDem,
      demoPropio: totDemProp,
      montoMuro:          muro.reduce((s, d) => s + (Number(d['Costo']) || 0), 0),
      montoMuroFinanciero:muro.reduce((s, d) => s + (Number(d['CostoFinanciero']) || 0), 0),
      unidadesMuro:       muro.length,
    };
  }, [dashboardData, catsMuro]);

  const agingData = useMemo(() => {
    let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
    dashboardData.forEach(d => {
      const dias = d['Días'] as number;
      if (dias <= 30) a0++;
      else if (dias <= 60) a1++;
      else if (dias <= 90) a2++;
      else a3++;
    });
    return [
      { name: '0-30 días',  value: a0, fill: '#22c55e' },
      { name: '31-60 días', value: a1, fill: '#eab308' },
      { name: '61-90 días', value: a2, fill: '#f97316' },
      { name: '+90 días',   value: a3, fill: '#ef4444' },
    ];
  }, [dashboardData]);

  const capitalData = useMemo(() => ([
    { name: 'Financiado',  value: stats.financiado,  fill: '#3b82f6' },
    { name: 'Propio',      value: stats.propio,       fill: '#f59e0b' },
    { name: 'Demo',        value: stats.demo,         fill: '#8b5cf6' },
    { name: 'Demo Propio', value: stats.demoPropio,   fill: '#ec4899' },
  ]), [stats]);

  const rankingModelos = useMemo(() => {
    const conteo: Record<string, number> = {};
    dashboardData.filter(d => (d['Días'] as number) > 90).forEach(d => {
      const key = String(d['Modelo'] || 'Sin modelo');
      conteo[key] = (conteo[key] || 0) + 1;
    });
    return Object.entries(conteo)
      .map(([modelo, uds]) => ({ modelo, uds }))
      .sort((a, b) => b.uds - a.uds)
      .slice(0, 10);
  }, [dashboardData]);

  const alertasSucursal = useMemo(() => {
    const mapa: Record<string, { rojas: number; costo: number }> = {};
    dashboardData.filter(d => (d['Días'] as number) > 90).forEach(d => {
      const suc = d['Sucursal'] as string;
      if (!mapa[suc]) mapa[suc] = { rojas: 0, costo: 0 };
      mapa[suc].rojas++;
      mapa[suc].costo += Number(d['Costo']) || 0;
    });
    return Object.entries(mapa)
      .map(([sucursal, v]) => ({ sucursal, ...v }))
      .sort((a, b) => b.rojas - a.rojas);
  }, [dashboardData]);

  const muroLamentos = useMemo(() => {
    let base = dashboardData.filter(d => (d['Días'] as number) > 90);
    if (catsMuro.length > 0) base = base.filter(d => catsMuro.includes(d['Categoría'] as string));
    return base.sort((a, b) => (b['Días'] as number) - (a['Días'] as number));
  }, [dashboardData, catsMuro]);

  const tableData = useMemo(() => {
    let curr = [...dashboardData].sort((a, b) => (b['Días'] as number) - (a['Días'] as number));
    if (catsTabla.length > 0) curr = curr.filter(d => catsTabla.includes(d['Categoría'] as string));
    if (!searchTerm) return curr;
    const lower = searchTerm.toLowerCase();
    return curr.filter(d =>
      String(d['Modelo'] ?? '').toLowerCase().includes(lower) ||
      String(d['Versión'] ?? '').toLowerCase().includes(lower) ||
      String(d['Color'] ?? '').toLowerCase().includes(lower) ||
      String(d['Sucursal'] ?? '').toLowerCase().includes(lower) ||
      String(d['Categoría'] ?? '').toLowerCase().includes(lower)
    );
  }, [dashboardData, searchTerm, catsTabla]);

  const fmtM = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(2)}M`
      : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  const handleMailto = () => {
    const fecha   = new Date().toLocaleDateString('es-MX');
    const agSel   = selectedAgencias.length > 0 ? selectedAgencias.join(', ') : 'Todas';
    const rojas   = dashboardData.filter(d => (d['Días'] as number) > 90).length;
    const alertas = alertasSucursal.map(a => `  • ${a.sucursal}: ${a.rojas} unidades en rojo`).join('\n');
    const body = encodeURIComponent(
      `Clínica de Inventario — ${fecha}\nSucursales: ${agSel}\n\nRESUMEN GENERAL\n• Total unidades: ${stats.unidades}\n• Inversión base: ${fmtM(stats.inversion)}\n• Costo Financiero: ${fmtM(stats.costoFinancieroTotal)}\n• Capital propio: ${fmtM(stats.capitalPropio)}\n• Unidades en rojo (+90 días): ${rojas}\n\nALERTAS POR SUCURSAL\n${alertas || '  Sin alertas'}`
    );
    window.open(`mailto:?subject=Clínica de Inventario ${fecha}&body=${body}`, '_blank');
  };

  const CustomTooltipBar = ({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { fill: string } }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const val   = payload[0].value;
    const color = payload[0].payload.fill;
    const display = String(label).includes('días') ? `${val} uds` : fmtCurrency(val);
    return (
      <div className="bg-white text-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 text-sm z-50">
        <p className="font-bold text-slate-500 mb-1">{label}</p>
        <p className="text-xl font-black" style={{ color }}>{display}</p>
      </div>
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-gray-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4" />
        <p className="text-sm font-bold tracking-widest uppercase">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Car className="text-blue-600" size={32} />
              Clínica de Inventario Nuevos
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Auditoría y Costo de Oportunidad Financiero Real</p>
          </div>
          <div className="flex items-center gap-3">
            {data.length > 0 && (
              <button
                onClick={handleMailto}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all shadow-sm"
              >
                <Mail size={16} /> Enviar resumen
              </button>
            )}
          </div>
        </div>

        {/* FILTROS GLOBALES */}
        {data.length > 0 && (agenciasEnInventario.autos.length + agenciasEnInventario.motos.length) > 1 && (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-slate-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                Filtros Globales
                {(selectedAgencias.length > 0 || selectedAnios.length > 0) && (
                  <span className="ml-2 text-blue-600">({selectedAgencias.length + selectedAnios.length} activos)</span>
                )}
              </span>
              {(selectedAgencias.length > 0 || selectedAnios.length > 0) && (
                <button
                  onClick={() => { setSelectedAgencias([]); setSelectedAnios([]); }}
                  className="ml-auto text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="space-y-6">
              {aniosUnicos.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Año Modelo</h4>
                  <div className="flex flex-wrap gap-2">
                    {aniosUnicos.map(anio => (
                      <button
                        key={anio}
                        onClick={() => toggleAnio(anio)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                          selectedAnios.includes(anio)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {anio}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(['autos', 'motos'] as const).map(sector => (
                <div key={sector}>
                  <h4 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">
                    {sector === 'autos' ? 'Sucursales Autos' : 'Agencias de Motos'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {agenciasEnInventario[sector].map(ag => (
                      <button
                        key={ag}
                        onClick={() => toggleAgencia(ag)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                          selectedAgencias.includes(ag)
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {ag}
                        <span className="ml-1 opacity-50">{data.filter(d => d['Sucursal'] === ag).length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.length > 0 && (
          <>
            {/* CARDS KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 items-stretch">
              {[
                { label: 'Unidades Totales', value: stats.unidades,             color: 'text-slate-900',  Icon: Database,        bg: 'bg-blue-50 text-blue-600',    sub: 'Stock Real Disponible' },
                { label: 'Inversión Base',   value: fmtM(stats.inversion),      color: 'text-emerald-600',Icon: BadgeDollarSign,  bg: 'bg-emerald-50 text-emerald-600', sub: 'Costo de Compra Neto' },
                { label: 'Costo Fin. Total', value: fmtM(stats.costoFinancieroTotal), color: 'text-purple-600', Icon: Clock, bg: 'bg-purple-50 text-purple-600', sub: `Tasa: ${(TASA_ANUAL * 100).toFixed(4)}%` },
                { label: 'Capital Propio',   value: fmtM(stats.capitalPropio),   color: 'text-amber-600',  Icon: TrendingUp,      bg: 'bg-amber-50 text-amber-600',  sub: 'Propios + Demos' },
              ].map(({ label, value, color, Icon, bg, sub }) => (
                <div key={label} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${bg}`}><Icon size={24} /></div>
                    <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">{label}</h3>
                  </div>
                  <p className={`text-3xl font-black tracking-tight my-2 ${color}`}>{value}</p>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-1 border-t border-slate-50">{sub}</div>
                </div>
              ))}

              {/* Muro de los Lamentos */}
              <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100 flex flex-col justify-between hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-red-700">
                    <div className="p-2.5 bg-red-500 text-white rounded-[14px] shadow-md shadow-red-500/20">
                      <AlertTriangle size={20} />
                    </div>
                    <h3 className="font-black uppercase tracking-wider text-[11px]">Muro de los Lamentos</h3>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-red-600 text-white rounded-md uppercase animate-pulse">
                    {catsMuro.length > 0 ? 'Filtro Activo 📊' : 'Todo Crítico 🔴'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Inversión Total</span>
                  <p className="text-3xl font-black text-red-600 tracking-tight">
                    {fmtM(stats.montoMuro + stats.montoMuroFinanciero)}
                  </p>
                  <div className="pt-2 border-t border-red-200/50 flex justify-between text-xs font-bold">
                    <span className="text-slate-400">Capital Base:</span>
                    <span className="text-slate-700 font-extrabold">{fmtM(stats.montoMuro)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-purple-400">Intereses:</span>
                    <span className="text-purple-600 font-extrabold">+{fmtM(stats.montoMuroFinanciero)}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-1 border-t border-red-200/30">
                  Evaluando {stats.unidadesMuro} unidades
                </div>
              </div>
            </div>

            {/* GRÁFICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { title: 'Distribución por Antigüedad', Icon: Clock,   data: agingData   },
                { title: 'Inversión por Capital',       Icon: BarChart3, data: capitalData },
              ].map(({ title, Icon, data: chartData }) => (
                <div key={title} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                  <div className="flex items-center gap-2 mb-6">
                    <Icon className="text-slate-400" size={20} />
                    <h3 className="text-slate-900 font-black text-lg">{title}</h3>
                  </div>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltipBar />} />
                        <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                          {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>

            {/* ALERTAS + RANKING */}
            {alertasSucursal.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Bell size={20} /></div>
                    <h3 className="text-slate-900 font-black text-lg">Alertas por Sucursal (+90 días)</h3>
                  </div>
                  <div className="space-y-3">
                    {alertasSucursal.map((a, i) => {
                      const totalRojas = dashboardData.filter(d => (d['Días'] as number) > 90).length;
                      const pct = Math.round((a.rojas / totalRojas) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-xl flex items-center justify-center text-xs font-black">{a.rojas}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 text-sm truncate">{a.sucursal}</p>
                            <p className="text-xs text-slate-500 font-semibold">{fmtM(a.costo)} inmovilizado · {pct}% del inventario antiguo</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 bg-yellow-50 text-yellow-500 rounded-xl"><Trophy size={20} /></div>
                    <h3 className="text-slate-900 font-black text-lg">Modelos con Mayor Estancamiento</h3>
                  </div>
                  <div className="space-y-2.5">
                    {rankingModelos.map((r, i) => {
                      const pct = Math.round((r.uds / rankingModelos[0].uds) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-400 w-5">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-black text-slate-800 truncate">{r.modelo}</span>
                              <span className="text-xs font-black text-red-600 ml-2">{r.uds} uds</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* MURO DE LOS LAMENTOS — TABLA */}
            {dashboardData.some(d => (d['Días'] as number) > 90) && (
              <div className="bg-white p-6 rounded-3xl border-2 border-red-500 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Skull className="text-red-500" /> MURO DE LOS LAMENTOS
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Unidades en estado crítico de permanencia de piso</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                    {[
                      { label: 'Capital', val: fmtCurrency(stats.montoMuro), color: 'text-slate-700' },
                      { label: 'Intereses', val: `+${fmtCurrency(stats.montoMuroFinanciero)}`, color: 'text-purple-600' },
                      { label: 'Capital + Interés', val: fmtCurrency(stats.montoMuro + stats.montoMuroFinanciero), color: 'text-red-600', highlight: true },
                    ].map(({ label, val, color, highlight }) => (
                      <div key={label} className={`text-left px-2 ${highlight ? 'bg-red-50 py-1 rounded-xl border border-red-100' : ''}`}>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider">{label}</span>
                        <span className={`${highlight ? 'text-base' : 'text-sm'} font-black ${color}`}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => exportToExcel(muroLamentos, 'muro-lamentos-nuevos')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-sm uppercase"
                  >
                    <FileSpreadsheet size={16} /> EXCEL
                  </button>
                </div>
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar:</span>
                  <FilterMultiCat selected={catsMuro} onChange={setCatsMuro} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-black border-b border-slate-200">
                      <tr>
                        {['VIN','SUCURSAL','MODELO','COSTO AUTO','COSTO FINANCIERO','INVERSIÓN TOTAL','DÍAS','CATEGORÍA'].map(h => (
                          <th key={h} className="px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {muroLamentos.map((row, idx) => {
                        const aging = getAgingColor(row['Días'] as number);
                        return (
                          <tr key={idx} className={`transition-colors ${aging.bg} hover:brightness-95`}>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{String(row['VIN'] || '-')}</td>
                            <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{String(row['Sucursal'])}</td>
                            <td className="px-4 py-3">
                              <span className="font-black text-slate-900 block">{String(row['Modelo'] || '-')}</span>
                              {row['Anio'] != null && <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">M.Y. {String(row['Anio'])}</span>}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-500 text-right">{fmtCurrency(Number(row['Costo']))}</td>
                            <td className="px-4 py-3 font-bold text-purple-600 text-right">{fmtCurrency(Number(row['CostoFinanciero']))}</td>
                            <td className="px-4 py-3 font-black text-red-600 text-right">{fmtCurrency(Number(row['InversionTotal']))}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-black text-red-600 bg-red-100 px-2 py-1 rounded-md">{String(row['Días'])} días</span>
                            </td>
                            <td className="px-4 py-3 text-center">{getCategoryBadge(String(row['Categoría']))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* INVENTARIO EXPANDIDO */}
            <div className="bg-white overflow-hidden rounded-3xl shadow-sm border border-slate-200/60 flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-slate-900 font-black text-xl flex items-center gap-2">
                    <Database className="text-blue-500" size={24} /> Inventario Expandido Total
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar sucursal, modelo o versión..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-11 pr-5 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 transition-all shadow-sm"
                      />
                    </div>
                    <button
                      onClick={() => exportToExcel(tableData, 'inventario-expandido-nuevos')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm uppercase whitespace-nowrap"
                    >
                      <Download size={14} /> Excel
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar:</span>
                  <FilterMultiCat selected={catsTabla} onChange={setCatsTabla} />
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-[11px] uppercase text-slate-500 font-black border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      {['VIN','SUCURSAL','MODELO / VERSIÓN','COLOR','CATEGORÍA','ANTIGÜEDAD','COSTO AUTO','COSTO FIN.','INVERSIÓN TOTAL'].map(h => (
                        <th key={h} className="px-6 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableData.slice(0, 150).map((row, idx) => {
                      const aging = getAgingColor(row['Días'] as number);
                      return (
                        <tr key={idx} className={`transition-colors ${aging.bg} hover:brightness-95`}>
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">{String(row['VIN'] || '-')}</td>
                          <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap">{String(row['Sucursal'])}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-slate-900">{String(row['Modelo'] || '-')}</span>
                              {row['Anio'] != null && <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">M.Y. {String(row['Anio'])}</span>}
                            </div>
                            <div className="text-xs font-medium text-slate-500 max-w-[200px] truncate" title={String(row['Versión'] || '')}>{String(row['Versión'] || '-')}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{String(row['Color'] || '')}</td>
                          <td className="px-6 py-4 text-center">{getCategoryBadge(String(row['Categoría']))}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-black px-2 py-1 rounded-md border text-xs ${aging.badge}`}>{String(row['Días'])} días</span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-500">{fmtCurrency(Number(row['Costo']))}</td>
                          <td className="px-6 py-4 text-right text-purple-600 font-bold">{fmtCurrency(Number(row['CostoFinanciero']))}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">{fmtCurrency(Number(row['InversionTotal']))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {tableData.length > 150 && (
                <div className="p-4 text-center text-xs font-bold text-slate-500 bg-slate-50 border-t border-slate-100">
                  Mostrando 150 de {tableData.length}. Filtra por categoría o usa el buscador para ver más.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
