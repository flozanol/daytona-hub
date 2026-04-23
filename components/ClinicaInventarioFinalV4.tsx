'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, TrendingUp, Filter, Clock, BadgeDollarSign, Car, BarChart3, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const getCategoryBadge = (cat: string) => {
  switch(cat) {
    case 'DEMO PROPIO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200 uppercase tracking-widest">{cat}</span>;
    case 'DEMO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-widest">{cat}</span>;
    case 'PROPIO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-widest">{cat}</span>;
    case 'FINANCIADO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-widest">{cat}</span>;
    default: return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-widest">{cat}</span>;
  }
};

// Verde (0-30) → Amarillo (31-60) → Naranja (61-90) → Rojo (+90)
const getAgingColor = (dias: number): { bg: string; badge: string } => {
  if (dias <= 30)  return { bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800 border-green-200' };
  if (dias <= 60)  return { bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (dias <= 90)  return { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800 border-orange-200' };
  return           { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800 border-red-200' };
};

const esFilaArbol = (row: any): boolean => {
  const sucursal = String(row['Sucursal'] ?? '').trim().toLowerCase();
  const subBrand = String(row['SubBrandDescrGbl'] ?? '').trim().toLowerCase();
  const submarca = String(row['Submarca'] ?? '').trim().toLowerCase();
  const version  = String(row['Versión'] ?? '').trim().toLowerCase();
  const color    = String(row['Color'] ?? '').trim().toLowerCase();
  if (sucursal === 'total') return true;
  if (subBrand === 'total') return true;
  if (submarca === 'total') return true;
  if (version  === 'total') return true;
  if (color    === 'total') return true;
  if (!row['Color'] || color === '') return true;
  return false;
};

export default function ClinicaInventarioFinal() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  const cleanNumber = (val: any) => {
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, '').replace(/\$/g, '').replace(/\s/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const unidadesExpandidas: any[] = [];
          results.data.forEach((row: any, idx: number) => {
            if (esFilaArbol(row)) return;
            const colorStr = String(row['Color']).trim();
            const cantTotal = cleanNumber(row['Cant. Total']) || 1;
            const veces = cantTotal > 0 ? cantTotal : 1;

            let categoria = 'OTRO';
            if (cleanNumber(row['Demo Propios']) > 0)      categoria = 'DEMO PROPIO';
            else if (cleanNumber(row['Demo']) > 0)         categoria = 'DEMO';
            else if (cleanNumber(row['Propios']) > 0)      categoria = 'PROPIO';
            else if (cleanNumber(row['Financiado']) > 0)   categoria = 'FINANCIADO';

            const mFin     = cleanNumber(row['Costo Financiados'])  / veces;
            const mProp    = cleanNumber(row['Costo Propios'])       / veces;
            const mDem     = cleanNumber(row['Costo Demo'])          / veces;
            const mDemProp = cleanNumber(row['Costo Demo Propios'])  / veces;

            const costoTotalOriginal = cleanNumber(row['Costo Total']);
            const costoUnit = costoTotalOriginal > 0
              ? costoTotalOriginal / veces
              : mFin + mProp + mDem + mDemProp;

            const diasRaw = cleanNumber(row['Antigüedad Promedio']);

            for (let i = 0; i < veces; i++) {
              unidadesExpandidas.push({
                id: `${idx}-${i}`,
                Sucursal:  String(row['Sucursal'] ?? '').trim() || 'Sin Sucursal',
                Modelo:    String(row['Submarca'] ?? '').trim(),
                Versión:   String(row['Versión']  ?? '').trim(),
                Color:     colorStr,
                Días:      diasRaw,
                Categoría: categoria,
                Costo:     costoUnit,
                mFin, mProp, mDem, mDemProp
              });
            }
          });
          setData(unidadesExpandidas);
          setIsLoaded(true);
        }
      });
    }
  };

  const dashboardData = useMemo(() => {
    if (selectedAgencia === 'Todas') return data;
    return data.filter(d => d.Sucursal === selectedAgencia);
  }, [data, selectedAgencia]);

  const agenciasUnicas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => set.add(d.Sucursal || 'Desconocida'));
    return ['Todas', ...Array.from(set).sort()];
  }, [data]);

  const stats = useMemo(() => {
    let totInversion = 0, totPropio = 0, totFin = 0, totDem = 0, totDemProp = 0;
    dashboardData.forEach(d => {
      totInversion += (d.mFin + d.mProp + d.mDem + d.mDemProp);
      totPropio    += d.mProp;
      totFin       += d.mFin;
      totDem       += d.mDem;
      totDemProp   += d.mDemProp;
    });
    return {
      unidades: dashboardData.length,
      inversion: totInversion,
      capitalPropio: totPropio + totDemProp,
      financiado: totFin,
      propio: totPropio,
      demo: totDem,
      demoPropio: totDemProp
    };
  }, [dashboardData]);

  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    dashboardData.forEach(d => {
      const e = d.Días;
      if (e <= 30)       a0_30++;
      else if (e <= 60)  a31_60++;
      else if (e <= 90)  a61_90++;
      else               a90plus++;
    });
    return [
      { name: '0-30 días',  value: a0_30,   fill: '#22c55e' },
      { name: '31-60 días', value: a31_60,  fill: '#eab308' },
      { name: '61-90 días', value: a61_90,  fill: '#f97316' },
      { name: '+90 días',   value: a90plus, fill: '#ef4444' },
    ];
  }, [dashboardData]);

  const capitalData = useMemo(() => ([
    { name: 'Financiado',  value: stats.financiado,  fill: '#3b82f6' },
    { name: 'Propio',      value: stats.propio,      fill: '#f59e0b' },
    { name: 'Demo',        value: stats.demo,        fill: '#8b5cf6' },
    { name: 'Demo Propio', value: stats.demoPropio,  fill: '#ec4899' }
  ]), [stats]);

  // MURO: solo > 45 días, top 15
  const muroLamentos = useMemo(() => {
    return [...dashboardData]
      .filter(d => d.Días > 45)
      .sort((a, b) => b.Días - a.Días)
      .slice(0, 15);
  }, [dashboardData]);

  // TABLA: ordenada por antigüedad de mayor a menor
  const tableData = useMemo(() => {
    let current = [...dashboardData].sort((a, b) => b.Días - a.Días);
    if (!searchTerm) return current;
    const lower = searchTerm.toLowerCase();
    return current.filter(d =>
      (d.Modelo    && d.Modelo.toLowerCase().includes(lower))    ||
      (d.Versión   && d.Versión.toLowerCase().includes(lower))   ||
      (d.Color     && d.Color.toLowerCase().includes(lower))     ||
      (d.Sucursal  && d.Sucursal.toLowerCase().includes(lower))  ||
      (d.Categoría && d.Categoría.toLowerCase().includes(lower))
    );
  }, [dashboardData, searchTerm]);

  const formatCurrencyM = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val   = payload[0].value;
      const color = payload[0].payload.fill;
      const displayValue = String(label).includes('días')
        ? `${val} uds`
        : formatCurrency(val);
      return (
        <div className="bg-white text-slate-800 p-3 rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 text-sm font-sans z-50">
          <p className="font-bold text-slate-500 mb-1">{label}</p>
          <p className="text-xl font-black" style={{ color }}>{displayValue}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Car className="text-blue-600" size={32} />
              Clínica de Inventario
            </h1>
            <p className="text-slate-500 text-sm font-semibold mt-1">Precisión Financiera de Unidades Reales</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {isLoaded && agenciasUnicas.length > 1 && (
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <Filter size={12} /> Sucursal
                </label>
                <div className="relative">
                  <select
                    value={selectedAgencia}
                    onChange={(e) => setSelectedAgencia(e.target.value)}
                    className="w-full sm:w-56 appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {agenciasUnicas.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 px-6 py-2.5 mt-5 sm:mt-0 bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer font-bold transition-all shadow-md w-full sm:w-auto text-sm">
              <Upload size={18} />
              {isLoaded ? 'Actualizar CSV' : 'Cargar Archivo'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* 1. CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Database size={24} className="stroke-[2px]" /></div>
                  <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Unidades Totales</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{stats.unidades}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><BadgeDollarSign size={24} className="stroke-[2px]" /></div>
                  <h3 className="font-bold uppercase tracking-widest text-xs text-slate-500">Inversión Total</h3>
                </div>
                <p className="text-4xl font-black text-emerald-600 tracking-tight">{formatCurrencyM(stats.inversion)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-amber-50 opacity-50 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp size={120} className="stroke-[1px]" />
                </div>
                <div className="flex items-center gap-3 text-amber-600 mb-4 z-10 relative">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100"><TrendingUp size={24} className="stroke-[2px]" /></div>
                  <h3 className="font-bold uppercase tracking-widest text-xs">Capital Propio</h3>
                </div>
                <p className="text-4xl font-black text-amber-600 tracking-tight z-10 relative">{formatCurrencyM(stats.capitalPropio)}</p>
                <div className="text-[10px] text-amber-800/60 mt-2 font-black z-10 relative uppercase tracking-widest">(Propios + Demo Propios)</div>
              </div>
            </div>

            {/* 2. GRÁFICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="text-slate-400" size={20} />
                  <h3 className="text-slate-900 font-black text-lg">Distribución por Antigüedad</h3>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltipBar />} />
                      <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                        {agingData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="text-slate-400" size={20} />
                  <h3 className="text-slate-900 font-black text-lg">Inversión por Capital</h3>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={capitalData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false}
                        tickFormatter={(val) => val >= 1000000 ? `$${(val / 1000000).toFixed(0)}M` : `$${val / 1000}k`} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltipBar />} />
                      <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                        {capitalData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. MURO DE LOS LAMENTOS — solo > 45 días */}
            {muroLamentos.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border-2 border-red-500 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-red-100 text-red-600 rounded-xl"><ShieldAlert size={24} className="stroke-[2px]" /></div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Muro de los Lamentos</h2>
                    <p className="text-sm font-semibold text-slate-500">Top 15 unidades con más de 45 días en inventario</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-black border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Sucursal</th>
                        <th className="px-4 py-3">Modelo</th>
                        <th className="px-4 py-3">Versión</th>
                        <th className="px-4 py-3">Color</th>
                        <th className="px-4 py-3 text-center">Días</th>
                        <th className="px-4 py-3 text-center rounded-tr-lg">Categoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {muroLamentos.map((row, idx) => {
                        const aging = getAgingColor(row.Días);
                        return (
                          <tr key={idx} className={`transition-colors ${aging.bg} hover:brightness-95`}>
                            <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{row.Sucursal}</td>
                            <td className="px-4 py-3 font-black text-slate-900">{row.Modelo || '-'}</td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-500 max-w-[200px] truncate" title={row.Versión}>{row.Versión || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{row.Color}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-black px-2 py-1 rounded-md border text-xs ${aging.badge}`}>{row.Días} días</span>
                            </td>
                            <td className="px-4 py-3 text-center">{getCategoryBadge(row.Categoría)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. INVENTARIO EXPANDIDO */}
            <div className="bg-white overflow-hidden rounded-3xl shadow-sm border border-slate-200/60 flex flex-col min-h-[500px]">
              <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100">
                <h3 className="text-slate-900 font-black text-xl flex items-center gap-2">
                  <Database className="text-blue-500" size={24} />
                  Inventario Expandido ({tableData.length})
                </h3>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar sucursal, modelo, versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-11 pr-5 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-[11px] uppercase text-slate-500 font-black border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Modelo / Versión</th>
                      <th className="px-6 py-4">Color</th>
                      <th className="px-6 py-4 text-center">Categoría</th>
                      <th className="px-6 py-4 text-center">Antigüedad ↓</th>
                      <th className="px-6 py-4 text-right">Costo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableData.slice(0, 150).map((row, idx) => {
                      const aging = getAgingColor(row.Días);
                      return (
                        <tr key={idx} className={`transition-colors ${aging.bg} hover:brightness-95`}>
                          <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap">{row.Sucursal}</td>
                          <td className="px-6 py-4">
                            <div className="font-black text-slate-900">{row.Modelo || '-'}</div>
                            <div className="text-xs font-medium text-slate-500 max-w-[200px] truncate" title={row.Versión}>{row.Versión || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{row.Color}</td>
                          <td className="px-6 py-4 text-center">{getCategoryBadge(row.Categoría)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-black px-2 py-1 rounded-md border text-xs ${aging.badge}`}>
                              {row.Días} días
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatCurrency(row.Costo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {tableData.length > 150 && (
                <div className="p-4 text-center text-xs font-bold text-slate-500 bg-slate-50 border-t border-slate-100">
                  Mostrando 150 de {tableData.length}. Filtre para ver más registros.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
