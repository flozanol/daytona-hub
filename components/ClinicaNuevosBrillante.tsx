'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, AlertCircle, CheckCircle2, TrendingUp, CheckCircle, BarChartIcon, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ClinicaNuevosBrillante() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData: any[] = [];
          
          results.data.forEach((row: any) => {
            const colorStr = row['Color'] ? String(row['Color']).trim() : '';
            const sucursalStr = row['Sucursal'] ? String(row['Sucursal']).trim() : '';
            const submarcaStr = row['Submarca'] ? String(row['Submarca']).trim() : '';
            
            // Filtro de Limpieza: Ignora Color nulo, Sucursal o Submarca con "Total"
            if (
              colorStr && 
              !sucursalStr.toLowerCase().includes('total') && 
              !submarcaStr.toLowerCase().includes('total')
            ) {
              
              const rawValor = row['Costo Total'] || '0';
              // Elimina comas/símbolos mantieniendo el signo negativo y el punto decimal
              const cleanCosto = parseFloat(String(rawValor).replace(/[^\d.-]/g, '')) || 0;
              
              const rawAntiguedad = row['Antigüedad Promedio'] || '0';
              const cleanAntiguedad = parseInt(String(rawAntiguedad).replace(/[^\d.-]/g, ''), 10) || 0;
              
              const rawCant = row['Cant. Total'] || '0';
              const cleanCant = parseFloat(String(rawCant).replace(/[^\d.-]/g, '')) || 0;

              parsedData.push({
                ...row,
                'Sucursal': sucursalStr,
                'Submarca': submarcaStr,
                'Costo Total Num': cleanCosto,
                'Antigüedad Num': cleanAntiguedad,
                'Cant Num': cleanCant,
              });
            }
          });
          
          setData(parsedData);
          setIsLoaded(true);
        }
      });
    }
  };

  // Lista única de agencias para el dropdown
  const agenciasUnicas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => set.add(d['Sucursal'] || 'Desconocida'));
    return ['Todas', ...Array.from(set).sort()];
  }, [data]);

  // Aplicar filtro global por agencia
  const dashboardData = useMemo(() => {
    if (selectedAgencia === 'Todas') return data;
    return data.filter(d => d['Sucursal'] === selectedAgencia);
  }, [data, selectedAgencia]);

  // Formato Moneda $M
  const formatCurrencyM = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };
  const formatCurrencyNormal = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  // KPIs
  const totalUnidades = dashboardData.reduce((acc, curr) => acc + curr['Cant Num'], 0);
  const inversionTotal = dashboardData.reduce((acc, curr) => acc + curr['Costo Total Num'], 0);
  
  const edadPromedio = dashboardData.length > 0 
    ? (dashboardData.reduce((acc, curr) => acc + curr['Antigüedad Num'], 0) / dashboardData.length).toFixed(0) // a entero
    : 0;

  const unidadesSanas = dashboardData.reduce((acc, curr) => curr['Antigüedad Num'] < 60 ? acc + curr['Cant Num'] : acc, 0);
  const pctSano = totalUnidades > 0 ? Math.round((unidadesSanas / totalUnidades) * 100) : 0;

  // Cómputo para Aging Histogram usando 'Cant Num'
  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    dashboardData.forEach(d => {
      const e = d['Antigüedad Num'];
      const c = d['Cant Num'] || 1; // Fallback to 1 if Cant Num is 0 but it exists
      if(e <= 30) a0_30 += c;
      else if(e <= 60) a31_60 += c;
      else if(e <= 90) a61_90 += c;
      else a90plus += c;
    });
    return [
      { name: '0-30 días', value: a0_30, fill: '#22c55e' }, // Verde Brillante
      { name: '31-60 días', value: a31_60, fill: '#eab308' }, // Amarillo Brillante
      { name: '61-90 días', value: a61_90, fill: '#f97316' }, // Naranja
      { name: '+90 días', value: a90plus, fill: '#ef4444' }, // Rojo Brillante
    ];
  }, [dashboardData]);

  // Cómputo para Top 10 Modelos (Submarca)
  const mapModelos = useMemo(() => {
    const m: Record<string, number> = {};
    dashboardData.forEach(d => {
      const mod = d['Submarca'] || 'Desconocido';
      m[mod] = (m[mod] || 0) + (d['Cant Num'] || 1);
    });
    return Object.keys(m)
      .map(k => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dashboardData]);

  // Colores para el Top 10 Modelos
  const barColors = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#8B5CF6', '#A78BFA', '#C4B5FD', '#4F46E5', '#6366F1', '#818CF8'];

  // Aplicar buscador de texto en la tabla
  const tableData = useMemo(() => {
    if (!searchTerm) return dashboardData;
    const lower = searchTerm.toLowerCase();
    return dashboardData.filter(d => 
      (d['Submarca'] && String(d['Submarca']).toLowerCase().includes(lower)) ||
      (d['Versión'] && String(d['Versión']).toLowerCase().includes(lower))
    );
  }, [dashboardData, searchTerm]);

  // Tooltip UI para Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white text-slate-800 p-3 rounded-xl border border-slate-200 shadow-xl text-sm font-sans">
          <p className="font-bold text-slate-500 mb-1">{`${label}`}</p>
          <p className="text-xl font-black" style={{ color: payload[0].payload.fill || '#3b82f6' }}>{`${payload[0].value} uds`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* CABECERA: Título, Filtro Global y Subida */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30">
              <BarChartIcon size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clínica de Inventario</h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Dashboard Gerencial (Autos Nuevos)</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {isLoaded && agenciasUnicas.length > 1 && (
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <Filter size={12} /> Filtrar por Agencia
                </label>
                <div className="relative">
                  <select
                    value={selectedAgencia}
                    onChange={(e) => setSelectedAgencia(e.target.value)}
                    className="w-full sm:w-64 appearance-none bg-[#F1F5F9] border-transparent text-slate-800 font-bold rounded-2xl px-5 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                  >
                    {agenciasUnicas.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-6 py-3 mt-5 sm:mt-0 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl cursor-pointer font-bold transition-all shadow-xl shadow-slate-900/20 w-full sm:w-auto text-sm">
              <Upload size={18} />
              {isLoaded ? 'Actualizar CSV' : 'Cargar Inventario (1).csv'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* 4 KPIs CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <Database size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-sm text-slate-500">Unidades Totales</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{totalUnidades}</p>
                <div className="text-sm text-slate-400 mt-2 font-semibold">Volumen disponible en piso</div>
              </div>

              <div className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-sm text-slate-500">Inversión Total</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrencyM(inversionTotal)}</p>
                <div className="text-sm text-slate-400 mt-2 font-semibold">Capitalización del stock</div>
              </div>

              <div className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <AlertCircle size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-sm text-slate-500">Edad Promedio</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{edadPromedio} <span className="text-xl text-slate-400 font-semibold tracking-normal">días</span></p>
                <div className="text-sm text-slate-400 mt-2 font-semibold">Antigüedad media global</div>
              </div>

              <div className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10"></div>
                <div className="flex items-center gap-3 text-slate-400 mb-4 z-10">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CheckCircle size={20} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-sm text-slate-500">Salud Inventario</h3>
                </div>
                <p className="text-4xl font-black text-indigo-600 tracking-tight z-10">{pctSano}%</p>
                <div className="text-sm text-slate-500 mt-2 font-bold flex items-center gap-1.5 z-10">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Unidades &lt; 60 días
                </div>
              </div>
            </div>

            {/* GRÁFICOS (IZQ Y DER) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* AGING DE INVENTARIO */}
              <div className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h3 className="text-slate-800 font-black text-xl mb-8 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full inline-block"></span> Aging de Inventario
                </h3>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 25, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={13} fontFamily="inherit" fontWeight={600} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={13} fontFamily="inherit" fontWeight={600} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f1f5f9', opacity: 0.8}} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[8, 8, 8, 8]} label={{ position: 'top', fill: '#475569', fontSize: 13, fontWeight: 'bold' }}>
                        {agingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TOP 10 MODELOS */}
              <div className="bg-white p-7 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <h3 className="text-slate-800 font-black text-xl mb-8 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span> Top 10 Modelos
                </h3>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mapModelos} layout="vertical" margin={{ top: 0, right: 40, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={13} fontFamily="inherit" fontWeight={600} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={12} fontFamily="inherit" fontWeight={700} width={120} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f1f5f9', opacity: 0.8}} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} label={{ position: 'right', fill: '#3b82f6', fontSize: 13, fontWeight: 'black' }}>
                        {mapModelos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* TABLA COMPLETA DE INVENTARIO */}
            <div className="bg-white p-2 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[600px] overflow-hidden">
              <div className="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-white z-20">
                <h3 className="text-slate-800 font-black text-xl flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-slate-800 rounded-full inline-block"></span> Lista Detallada de Inventario ({tableData.length})
                </h3>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar modelo o versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#F8FAFC] border-transparent text-slate-800 rounded-2xl pl-11 pr-5 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto relative bg-white rounded-b-2xl">
                <table className="w-full text-sm text-left relative">
                  <thead className="bg-[#F8FAFC] text-[11px] uppercase text-slate-500 font-bold sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 tracking-wider">Sucursal</th>
                      <th className="px-6 py-4 tracking-wider">Submarca</th>
                      <th className="px-6 py-4 tracking-wider">Versión</th>
                      <th className="px-6 py-4 tracking-wider">Color</th>
                      <th className="px-6 py-4 text-center tracking-wider">Antigüedad Promedio</th>
                      <th className="px-6 py-4 text-right tracking-wider">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row, idx) => {
                      const antiguedad = row['Antigüedad Num'];
                      const isHighAging = antiguedad > 70;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">{row['Sucursal'] || '-'}</td>
                          <td className="px-6 py-4 font-black text-slate-900 whitespace-nowrap">{row['Submarca'] || '-'}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500 max-w-[280px] truncate" title={row['Versión']}>{row['Versión'] || '-'}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-2.5 whitespace-nowrap">
                            <span 
                              className="w-4 h-4 rounded-full shadow-sm border border-slate-200 block" 
                              style={{ backgroundColor: String(row['Color']).toLowerCase().includes('blanco') ? '#fff' : 
                                      String(row['Color']).toLowerCase().includes('negro') ? '#1e293b' : 
                                      String(row['Color']).toLowerCase().includes('plata') ? '#cbd5e1' : 
                                      String(row['Color']).toLowerCase().includes('gris') ? '#94a3b8' : 
                                      String(row['Color']).toLowerCase().includes('rojo') ? '#ef4444' : 
                                      String(row['Color']).toLowerCase().includes('azul') ? '#3b82f6' : '#f1f5f9' }} 
                            />
                            {row['Color'] || '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isHighAging ? (
                              <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-black bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                {antiguedad} días
                              </span>
                            ) : (
                              <span className="font-bold text-slate-700">{antiguedad} días</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap group-hover:text-blue-600 transition-colors">
                            {formatCurrencyNormal(row['Costo Total Num'])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}

      </div>
    </div>
  );
}
