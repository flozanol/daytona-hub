'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, AlertCircle, TrendingUp, PieChart as PieChartIcon, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function ClinicaInventarioFinanciero() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  const cleanNumber = (val: any) => parseFloat(String(val || '0').replace(/[^\d.-]/g, '')) || 0;

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
            
            if (
              colorStr && 
              !sucursalStr.toLowerCase().includes('total') && 
              !submarcaStr.toLowerCase().includes('total')
            ) {
              const cleanCosto = cleanNumber(row['Costo Total']);
              const cleanAntiguedad = parseInt(String(row['Antigüedad Promedio'] || '0').replace(/[^\d.-]/g, ''), 10) || 0;
              const cleanCant = cleanNumber(row['Cant. Total']);
              
              const cantFinanciado = cleanNumber(row['Financiado']);
              const costoFinanciado = cleanNumber(row['Costo Financiados']);
              const cantPropios = cleanNumber(row['Propios']);
              const costoPropios = cleanNumber(row['Costo Propios']);
              const cantDemo = cleanNumber(row['Demo']) + cleanNumber(row['Demo Propios']);
              const costoDemo = cleanNumber(row['Costo Demo']) + cleanNumber(row['Costo Demo Propios']);

              let tipoCapital = '-';
              if (cantPropios > 0) tipoCapital = 'P';
              else if (cantFinanciado > 0) tipoCapital = 'F';
              else if (cantDemo > 0) tipoCapital = 'D';

              parsedData.push({
                ...row,
                'Sucursal': sucursalStr,
                'Submarca': submarcaStr,
                'Costo Total Num': cleanCosto,
                'Antigüedad Num': cleanAntiguedad,
                'Cant Num': cleanCant,
                cantFinanciado,
                costoFinanciado,
                cantPropios,
                costoPropios,
                cantDemo,
                costoDemo,
                tipoCapital
              });
            }
          });
          
          setData(parsedData);
          setIsLoaded(true);
        }
      });
    }
  };

  const agenciasUnicas = useMemo(() => {
    const set = new Set<string>();
    data.forEach(d => set.add(d['Sucursal'] || 'Desconocida'));
    return ['Todas', ...Array.from(set).sort()];
  }, [data]);

  const dashboardData = useMemo(() => {
    if (selectedAgencia === 'Todas') return data;
    return data.filter(d => d['Sucursal'] === selectedAgencia);
  }, [data, selectedAgencia]);

  const formatCurrencyM = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  const formatCurrencyNormal = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  // KPIs Generales
  const totalUnidades = dashboardData.reduce((acc, curr) => acc + curr['Cant Num'], 0);
  const inversionTotal = dashboardData.reduce((acc, curr) => acc + curr['Costo Total Num'], 0);
  const capitalPropio = dashboardData.reduce((acc, curr) => acc + curr.costoPropios, 0);
  const edadPromedio = dashboardData.length > 0 
    ? (dashboardData.reduce((acc, curr) => acc + curr['Antigüedad Num'], 0) / dashboardData.length).toFixed(0)
    : 0;

  // Donuts Mix Data (Inversión Financiera)
  const capitalFinanciado = dashboardData.reduce((acc, curr) => acc + curr.costoFinanciado, 0);
  const capitalDemos = dashboardData.reduce((acc, curr) => acc + curr.costoDemo, 0);
  
  const mixCapitalData = [
    { name: 'Financiado', value: capitalFinanciado, fill: '#3b82f6' }, // Azul
    { name: 'Propios', value: capitalPropio, fill: '#f59e0b' }, // Ámbar
    { name: 'Demos', value: capitalDemos, fill: '#8b5cf6' }, // Violeta
  ].filter(item => item.value > 0);

  // Aging Histogram
  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    dashboardData.forEach(d => {
      const e = d['Antigüedad Num'];
      const c = d['Cant Num'] || 1;
      if(e <= 30) a0_30 += c;
      else if(e <= 60) a31_60 += c;
      else if(e <= 90) a61_90 += c;
      else a90plus += c;
    });
    return [
      { name: '0-30 días', value: a0_30, fill: '#22c55e' },
      { name: '31-60 días', value: a31_60, fill: '#eab308' },
      { name: '61-90 días', value: a61_90, fill: '#f97316' },
      { name: '+90 días', value: a90plus, fill: '#ef4444' },
    ];
  }, [dashboardData]);

  // Top 10 Modelos (Por Valor de Inventario)
  const mapModelos = useMemo(() => {
    const m: Record<string, number> = {};
    dashboardData.forEach(d => {
      const mod = d['Submarca'] || 'Desconocido';
      m[mod] = (m[mod] || 0) + (d['Costo Total Num'] || 0); // Sumar costo en lugar de unidades
    });
    return Object.keys(m)
      .map(k => ({ name: k, value: m[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [dashboardData]);

  const barColorsValues = ['#0284c7', '#0369a1', '#075985', '#0c4a6e', '#1e3a8a', '#312e81', '#3730a3', '#4c1d95', '#5b21b6', '#6b21a8'];

  // Búsqueda en tabla
  const tableData = useMemo(() => {
    if (!searchTerm) return dashboardData;
    const lower = searchTerm.toLowerCase();
    return dashboardData.filter(d => 
      (d['Submarca'] && String(d['Submarca']).toLowerCase().includes(lower)) ||
      (d['Versión'] && String(d['Versión']).toLowerCase().includes(lower))
    );
  }, [dashboardData, searchTerm]);

  // Tooltips
  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white text-slate-800 p-3 rounded-xl border border-slate-200 shadow-xl text-sm font-sans z-50">
          <p className="font-bold text-slate-500 mb-1">{`${label}`}</p>
          <p className="text-xl font-black" style={{ color: payload[0].payload.fill || '#3b82f6' }}>
            {payload[0].payload.name?.includes('Top 10') || payload[0].dataKey === 'value' && payload[0].value > 1000 ? 
              formatCurrencyM(payload[0].value) : `${payload[0].value} uds`}
          </p>
        </div>
      );
    }
    return null;
  };
  
  const CustomTooltipMoney = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && payload[0].value) {
      return (
        <div className="bg-white text-slate-800 p-3 rounded-xl border border-slate-200 shadow-xl text-sm font-sans z-50">
          <p className="font-bold text-slate-500 mb-1">{`${label}`}</p>
          <p className="text-xl font-black" style={{ color: payload[0].payload.fill || '#3b82f6' }}>
            {formatCurrencyM(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl text-sm font-sans z-50">
          <p className="font-bold text-slate-500 mb-1">{data.name}</p>
          <p className="text-xl font-black" style={{ color: data.fill }}>{formatCurrencyM(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-white text-slate-800 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-[#0f172a] to-[#334155] p-4 rounded-2xl shadow-lg">
              <PieChartIcon size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Clínica de Inventario</h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Visión CFO / Capital de Trabajo</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {isLoaded && agenciasUnicas.length > 1 && (
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <Filter size={12} /> Filtrar Sucursal
                </label>
                <div className="relative">
                  <select
                    value={selectedAgencia}
                    onChange={(e) => setSelectedAgencia(e.target.value)}
                    className="w-full sm:w-56 appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-2xl px-5 py-3 outline-none focus:border-[#0f172a] focus:ring-4 focus:ring-slate-900/5 transition-all cursor-pointer"
                  >
                    {agenciasUnicas.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-6 py-3 mt-5 sm:mt-0 bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl cursor-pointer font-bold transition-all shadow-xl shadow-slate-900/20 w-full sm:w-auto text-sm">
              <Upload size={18} />
              {isLoaded ? 'Actualizar CSV' : 'Cargar Inventario (1).csv'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* 4 KPIs SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-slate-100 text-slate-700 rounded-[14px]">
                    <Database size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Unidades Totales</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{totalUnidades}</p>
                <div className="text-xs text-slate-400 mt-2 font-semibold">Stock general en piso</div>
              </div>

              <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-[14px]">
                    <TrendingUp size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Inversión Total</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrencyM(inversionTotal)}</p>
                <div className="text-xs text-slate-400 mt-2 font-semibold">Valor Factura del inventario</div>
              </div>

              <div className="bg-amber-50 p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(245,158,11,0.15)] border border-amber-200 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-[-20%] top-[-10%] w-48 h-48 bg-amber-400/10 rounded-full group-hover:scale-110 transition-transform -z-0"></div>
                <div className="flex items-center gap-3 text-amber-700 mb-4 z-10">
                  <div className="p-2.5 bg-amber-500 text-white rounded-[14px] shadow-lg shadow-amber-500/20">
                    <Database size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-black uppercase tracking-wider text-[11px]">Capital Propio</h3>
                </div>
                <p className="text-4xl font-black text-amber-600 tracking-tight z-10">{formatCurrencyM(capitalPropio)}</p>
                <div className="text-xs text-amber-800/70 mt-2 font-bold z-10 flex items-center gap-1">
                  <AlertCircle size={14} /> Capital Estancado
                </div>
              </div>

              <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-slate-100 text-slate-600 rounded-[14px]">
                    <TrendingUp size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Edad Promedio</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{edadPromedio} <span className="text-xl text-slate-400 font-semibold tracking-normal">días</span></p>
                <div className="text-xs text-slate-400 mt-2 font-semibold">Tasa de rotación actual</div>
              </div>
            </div>

            {/* MEZCLA DE CAPITAL Y GRÁFICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* MIX DE CAPITAL */}
              <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center">
                <h3 className="text-slate-800 font-black text-lg w-full mb-2">Mezcla de Capital</h3>
                <p className="text-slate-400 text-xs font-semibold w-full mb-6">Origen de fondos del inventario</p>
                
                <div className="h-[200px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mixCapitalData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {mixCapitalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Texto Central */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-slate-400">Total</span>
                    <span className="text-lg font-black text-slate-800">{formatCurrencyM(inversionTotal)}</span>
                  </div>
                </div>

                <div className="w-full mt-4 space-y-3">
                  {mixCapitalData.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></span>
                        <span className="text-sm font-semibold text-slate-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">{(((item.value / inversionTotal) * 100) || 0).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AGING DE INVENTARIO */}
              <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 lg:col-span-1">
                <h3 className="text-slate-800 font-black text-lg mb-8">Riesgo por Antigüedad</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltipBar />} />
                      <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                        {agingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TOP 10 VALOR INVENTARIO */}
              <div className="bg-white p-7 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 lg:col-span-1">
                <h3 className="text-slate-800 font-black text-lg mb-6">Inversión por Modelo</h3>
                <div className="h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mapModelos} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(val) => `$${(val/1000000).toFixed(0)}M`} fontFamily="inherit" fontWeight={700} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} fontFamily="inherit" fontWeight={700} width={90} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltipMoney />} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#0f172a', fontSize: 10, fontWeight: 'black', formatter: (value: number) => formatCurrencyM(value) }}>
                        {mapModelos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={barColorsValues[index % barColorsValues.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* TABLA COMPLETA DE INVENTARIO */}
            <div className="bg-white p-2 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-[550px] overflow-hidden">
              <div className="p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-white z-20">
                <h3 className="text-slate-800 font-black text-lg flex items-center gap-2">
                  Desglose Operativo ({tableData.length} registros)
                </h3>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar modelo o versión..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl pl-11 pr-5 py-2.5 text-sm font-semibold outline-none focus:border-[#0f172a] focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto relative bg-white">
                <table className="w-full text-sm text-left relative">
                  <thead className="bg-[#f8fafc] text-[10px] uppercase text-slate-500 font-black sticky top-0 z-10 shadow-sm border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">TIPO</th>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Submarca</th>
                      <th className="px-6 py-4">Versión</th>
                      <th className="px-6 py-4">Color</th>
                      <th className="px-6 py-4 text-center">Edad (Días)</th>
                      <th className="px-6 py-4 text-right">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row, idx) => {
                      const antiguedad = row['Antigüedad Num'];
                      const isHighAging = antiguedad > 70;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            {row.tipoCapital === 'P' && <span className="px-2 py-1 bg-amber-100 text-amber-700 font-black text-xs rounded-lg border border-amber-200">P</span>}
                            {row.tipoCapital === 'F' && <span className="px-2 py-1 bg-blue-100 text-blue-700 font-black text-xs rounded-lg border border-blue-200">F</span>}
                            {row.tipoCapital === 'D' && <span className="px-2 py-1 bg-violet-100 text-violet-700 font-black text-xs rounded-lg border border-violet-200">D</span>}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-bold whitespace-nowrap">{row['Sucursal'] || '-'}</td>
                          <td className="px-6 py-4 font-black text-slate-900 whitespace-nowrap">{row['Submarca'] || '-'}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500 max-w-[220px] truncate" title={row['Versión']}>{row['Versión'] || '-'}</td>
                          <td className="px-6 py-4 text-slate-600 font-semibold">{row['Color'] || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            {isHighAging ? (
                              <span className="inline-flex items-center justify-center px-3 py-1 bg-red-600 text-white font-black text-xs rounded-lg shadow-md shadow-red-600/30">
                                {antiguedad}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-700">{antiguedad}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap group-hover:text-blue-600 transition-colors">
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
