'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, AlertCircle, CheckCircle2, TrendingUp, CheckCircle, BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClinicaNuevosV2() {
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
          let parsedData: any[] = [];
          
          results.data.forEach((row: any) => {
            const colorStr = row['Color'] ? String(row['Color']) : '';
            const sucursalStr = row['Sucursal'] ? String(row['Sucursal']) : '';
            
            // Filtro: Color NO es nulo y Sucursal NO contiene "Total"
            if (colorStr && !sucursalStr.toLowerCase().includes('total')) {
              
              const rawValor = row['Costo Total'] || '0';
              const cleanValorStr = String(rawValor).replace(/,/g, '').replace(/\$/g, '');
              const cleanCosto = parseFloat(cleanValorStr) || 0;
              
              const rawAntiguedad = row['Antigüedad Promedio'] || '0';
              const cleanAntiguedad = parseInt(String(rawAntiguedad).replace(/[^\d.-]/g, ''), 10) || 0;
              
              const rawCant = row['Cant. Total'] || '0';
              const cleanCant = parseFloat(String(rawCant).replace(/[^\d.-]/g, '')) || 0;

              parsedData.push({
                ...row,
                'Sucursal': sucursalStr,
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
    ? (dashboardData.reduce((acc, curr) => acc + curr['Antigüedad Num'], 0) / dashboardData.length).toFixed(1)
    : 0;

  const unidadesSanas = dashboardData.reduce((acc, curr) => curr['Antigüedad Num'] < 60 ? acc + curr['Cant Num'] : acc, 0);
  const pctSano = totalUnidades > 0 ? ((unidadesSanas / totalUnidades) * 100).toFixed(1) : 0;

  // Cómputo para Aging Histogram usando 'Cant Num'
  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    dashboardData.forEach(d => {
      const e = d['Antigüedad Num'];
      const c = d['Cant Num'];
      if(e <= 30) a0_30 += c;
      else if(e <= 60) a31_60 += c;
      else if(e <= 90) a61_90 += c;
      else a90plus += c;
    });
    return [
      { name: '0-30 días', value: a0_30, fill: '#22c55e' }, // Verde (Sano)
      { name: '31-60 días', value: a31_60, fill: '#eab308' }, // Amarillo (Precaución)
      { name: '61-90 días', value: a61_90, fill: '#f97316' }, // Naranja (Alerta)
      { name: '+90 días', value: a90plus, fill: '#ef4444' }, // Rojo (Crítico)
    ];
  }, [dashboardData]);

  // Cómputo para Top 10 Modelos (Submarca)
  const mapModelos = useMemo(() => {
    const m: Record<string, number> = {};
    dashboardData.forEach(d => {
      const mod = d['Submarca'] || 'Desconocido';
      m[mod] = (m[mod] || 0) + d['Cant Num'];
    });
    return Object.keys(m)
      .map(k => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dashboardData]);

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
        <div className="bg-[#1e293b] text-white p-3 rounded-lg border border-slate-700 shadow-xl text-sm">
          <p className="font-bold text-slate-300">{`${label}`}</p>
          <p className="text-xl font-black text-white">{`${payload[0].value} uds`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-[#0f172a] text-slate-300 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* CABECERA: Título, Subida y Filtro Global */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-4">
            <div className="bg-blue-900/50 p-3 rounded-xl border border-blue-500/30">
              <BarChartIcon size={28} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Clínica de Inventario</h1>
              <p className="text-slate-400 text-sm font-medium mt-1">Dashboard Gerencial (Autos Nuevos)</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {isLoaded && agenciasUnicas.length > 1 && (
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 ml-1">Seleccionar Agencia</label>
                <div className="relative">
                  <select
                    value={selectedAgencia}
                    onChange={(e) => setSelectedAgencia(e.target.value)}
                    className="w-full sm:w-64 appearance-none bg-[#0f172a] border border-slate-700 text-white font-medium rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors shadow-inner"
                  >
                    {agenciasUnicas.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-6 py-3 mt-5 sm:mt-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer font-bold transition-all shadow-lg hover:shadow-blue-500/20 w-full sm:w-auto">
              <Upload size={18} />
              {isLoaded ? 'Actualizar CSV' : 'Cargar Inventario.csv'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* 4 KPIs CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <Database size={16} />
                  <h3 className="font-bold uppercase tracking-wider text-xs">Unidades Totales</h3>
                </div>
                <p className="text-3xl font-black text-white">{totalUnidades}</p>
                <div className="text-xs text-slate-500 mt-2 font-medium">Volumen disponible en piso</div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <TrendingUp size={16} />
                  <h3 className="font-bold uppercase tracking-wider text-xs">Inversión Total</h3>
                </div>
                <p className="text-3xl font-black text-emerald-400">{formatCurrencyM(inversionTotal)}</p>
                <div className="text-xs text-slate-500 mt-2 font-medium">Capitalización del stock</div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <AlertCircle size={16} />
                  <h3 className="font-bold uppercase tracking-wider text-xs">Edad Promedio</h3>
                </div>
                <p className="text-3xl font-black text-white">{edadPromedio} <span className="text-lg text-slate-500 font-medium tracking-normal">días</span></p>
                <div className="text-xs text-slate-500 mt-2 font-medium">Antigüedad media global</div>
              </div>

              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <CheckCircle size={16} />
                  <h3 className="font-bold uppercase tracking-wider text-xs">% Inventario Sano</h3>
                </div>
                <p className="text-3xl font-black text-blue-400">{pctSano}%</p>
                <div className="text-xs text-emerald-500/80 mt-2 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Unidades menores a 60 días
                </div>
              </div>
            </div>

            {/* GRÁFICOS (IZQ Y DER) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* AGING DE INVENTARIO */}
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md">
                <h3 className="text-white font-bold text-lg mb-6">Aging de Inventario</h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#334155', opacity: 0.3}} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TOP 10 MODELOS */}
              <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md">
                <h3 className="text-white font-bold text-lg mb-6">Top 10 Modelos (Stock)</h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mapModelos} layout="vertical" margin={{ top: 0, right: 40, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={140} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#334155', opacity: 0.3}} content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* TABLA COMPLETA DE INVENTARIO */}
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col h-[500px]">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 shrink-0">
                <h3 className="text-white font-bold text-lg">Lista Detallada de Inventario ({tableData.length} ítems)</h3>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por submarca o versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-slate-800 relative bg-[#0f172a]">
                <table className="w-full text-sm text-left relative">
                  <thead className="bg-[#1e293b] text-xs uppercase text-slate-400 font-bold sticky top-0 z-10 shadow-sm border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Submarca</th>
                      <th className="px-6 py-4">Versión</th>
                      <th className="px-6 py-4">Color</th>
                      <th className="px-6 py-4 text-center">Edad (Días)</th>
                      <th className="px-6 py-4 text-right">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {tableData.map((row, idx) => {
                      const isHot = row['Antigüedad Num'] > 75;
                      const isSano = row['Antigüedad Num'] < 30;
                      
                      return (
                        <tr key={idx} className={`hover:bg-[#1e293b] transition-colors ${isHot ? 'bg-red-950/20' : ''}`}>
                          <td className="px-6 py-3 text-slate-300 font-medium whitespace-nowrap">{row['Sucursal'] || '-'}</td>
                          <td className="px-6 py-3 font-bold text-white whitespace-nowrap">{row['Submarca'] || '-'}</td>
                          <td className="px-6 py-3 text-xs text-slate-400 max-w-[280px] truncate" title={row['Versión']}>{row['Versión'] || '-'}</td>
                          <td className="px-6 py-3 text-slate-300 flex items-center gap-2 whitespace-nowrap">
                            <span 
                              className="w-3 h-3 rounded-full border border-slate-600 block shadow-sm" 
                              style={{ backgroundColor: String(row['Color']).toLowerCase() === 'blanco' ? '#fff' : 
                                      String(row['Color']).toLowerCase() === 'negro' ? '#000' : 
                                      String(row['Color']).toLowerCase() === 'plata' ? '#cbd5e1' : 
                                      String(row['Color']).toLowerCase() === 'gris' ? '#64748b' : 
                                      String(row['Color']).toLowerCase() === 'rojo' ? '#ef4444' : 
                                      String(row['Color']).toLowerCase() === 'azul' ? '#3b82f6' : 'transparent' }} 
                            />
                            {row['Color'] || '-'}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isHot ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black bg-red-500 text-white shadow-sm shadow-red-900/50">
                                {row['Antigüedad Num']}
                              </span>
                            ) : isSano ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                                {row['Antigüedad Num']}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-300">{row['Antigüedad Num']}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">{formatCurrencyNormal(row['Costo Total Num'])}</td>
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
