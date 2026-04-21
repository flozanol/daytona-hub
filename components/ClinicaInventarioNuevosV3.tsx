'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, AlertCircle, TrendingUp, PieChart as PieChartIcon, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function ClinicaInventarioNuevosV3() {
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
            
            // 1. REGLA CRÍTICA DE FILTRADO (EVITAR DUPLICADOS)
            const isValidColor = colorStr !== '' 
              && colorStr.toLowerCase() !== 'total' 
              && colorStr.toLowerCase() !== 'sin clasificar';
              
            const isValidSucursal = !sucursalStr.toLowerCase().includes('total') 
              && !sucursalStr.toLowerCase().includes('filtros aplicados');

            if (isValidColor && isValidSucursal) {
              // 2. PROCESAMIENTO DE CATEGORÍAS (DINERO Y UNIDADES)
              const cleanCostoTotal = cleanNumber(row['Costo Total']);
              const cleanCantTotal = cleanNumber(row['Cant. Total']);
              const cleanAntiguedad = parseInt(String(row['Antigüedad Promedio'] || '0').replace(/[^\d.-]/g, ''), 10) || 0;
              
              const cantFinanciado = cleanNumber(row['Financiado']);
              const costoFinanciado = cleanNumber(row['Costo Financiados']);
              
              const cantPropios = cleanNumber(row['Propios']);
              const costoPropios = cleanNumber(row['Costo Propios']);
              
              const cantDemo = cleanNumber(row['Demo']);
              const costoDemo = cleanNumber(row['Costo Demo']);
              
              const cantDemoPropios = cleanNumber(row['Demo Propios']);
              const costoDemoPropios = cleanNumber(row['Costo Demo Propios']);

              const totalDemosUnidades = cantDemo + cantDemoPropios;
              const totalDemosCosto = costoDemo + costoDemoPropios;

              let tipoCapital = '-';
              if (costoPropios > 0) tipoCapital = 'P';
              else if (costoFinanciado > 0) tipoCapital = 'F';
              else if (totalDemosCosto > 0) tipoCapital = 'D';

              parsedData.push({
                ...row,
                'Sucursal': sucursalStr,
                'Submarca': row['Submarca'] ? String(row['Submarca']).trim() : '',
                'Versión': row['Versión'] ? String(row['Versión']).trim() : '',
                'Color': colorStr,
                'Costo Total Num': cleanCostoTotal,
                'Antigüedad Num': cleanAntiguedad,
                'Cant Num': cleanCantTotal,
                cantFinanciado,
                costoFinanciado,
                cantPropios,
                costoPropios,
                totalDemosUnidades,
                totalDemosCosto,
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

  // Donuts Mix Data (Inversión Financiera)
  const capitalFinanciado = dashboardData.reduce((acc, curr) => acc + curr.costoFinanciado, 0);
  const capitalDemos = dashboardData.reduce((acc, curr) => acc + curr.totalDemosCosto, 0);
  
  const mixCapitalData = [
    { name: 'Financiados', value: capitalFinanciado, fill: '#3b82f6' }, // Azul vibrante
    { name: 'Propios', value: capitalPropio, fill: '#f59e0b' }, // Ambar vibrante
    { name: 'Demos', value: capitalDemos, fill: '#8b5cf6' }, // Violeta vibrante
  ].filter(item => item.value > 0);

  // Aging Histogram (Vívida)
  const agingData = useMemo(() => {
    let a0_30 = 0, a31_60 = 0, a61_90 = 0, a90plus = 0;
    dashboardData.forEach(d => {
      const e = d['Antigüedad Num'];
      const c = d['Cant Num'] || 1; // Usando unidades proporcionales a la fila
      if(e <= 30) a0_30 += c;
      else if(e <= 60) a31_60 += c;
      else if(e <= 90) a61_90 += c;
      else a90plus += c;
    });
    return [
      { name: '0-30 días', value: a0_30, fill: '#22c55e' }, // Verde
      { name: '31-60 días', value: a31_60, fill: '#eab308' }, // Amarillo
      { name: '61-90 días', value: a61_90, fill: '#f97316' }, // Naranja
      { name: '+90 días', value: a90plus, fill: '#ef4444' }, // Rojo vibrante
    ];
  }, [dashboardData]);

  // Búsqueda en tabla
  const tableData = useMemo(() => {
    if (!searchTerm) return dashboardData;
    const lower = searchTerm.toLowerCase();
    return dashboardData.filter(d => 
      (d['Submarca'] && String(d['Submarca']).toLowerCase().includes(lower)) ||
      (d['Versión'] && String(d['Versión']).toLowerCase().includes(lower)) ||
      (d['Color'] && String(d['Color']).toLowerCase().includes(lower))
    );
  }, [dashboardData, searchTerm]);

  // Tooltips
  const CustomTooltipBar = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white text-slate-800 p-3 rounded-xl border border-slate-200 shadow-xl text-sm font-sans z-50">
          <p className="font-bold text-slate-500 mb-1">{`${label}`}</p>
          <p className="text-xl font-black" style={{ color: payload[0].payload.fill || '#3b82f6' }}>
            {`${payload[0].value} uds`}
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg shadow-blue-600/30">
              <PieChartIcon size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clínica de Inventario</h1>
              <p className="text-slate-500 text-sm font-semibold mt-1">Dashboard Financiero y Operativo</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* FILTRO DE AGENCIA */}
            {isLoaded && agenciasUnicas.length > 1 && (
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1">
                  <Filter size={12} /> Filtro Agencia
                </label>
                <div className="relative">
                  <select
                    value={selectedAgencia}
                    onChange={(e) => setSelectedAgencia(e.target.value)}
                    className="w-full sm:w-56 appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                  >
                    {agenciasUnicas.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                </div>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-6 py-2.5 mt-5 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer font-bold transition-all shadow-lg shadow-blue-600/30 w-full sm:w-auto text-sm">
              <Upload size={18} />
              {isLoaded ? 'Actualizar CSV' : 'Cargar Inventario (2).csv'}
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* 3 TARJETAS SUPERIORES */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-7 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                    <Database size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Unidades Totales</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{totalUnidades}</p>
                <div className="text-xs text-slate-400 mt-2 font-semibold">Stock general cargado</div>
              </div>

              <div className="bg-white p-7 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <TrendingUp size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Inversión Total</h3>
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrencyM(inversionTotal)}</p>
                <div className="text-xs text-slate-400 mt-2 font-semibold">Valor Factura del inventario</div>
              </div>

              <div className="bg-amber-50 p-7 rounded-[1.5rem] shadow-sm border border-amber-200 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute right-[-10%] top-[-10%] w-40 h-40 bg-amber-400/10 rounded-full group-hover:scale-110 transition-transform -z-0"></div>
                <div className="flex items-center gap-3 text-amber-700 mb-4 z-10">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
                    <Database size={20} className="stroke-[2.5px]" />
                  </div>
                  <h3 className="font-black uppercase tracking-wider text-[11px]">Inversión en Propios</h3>
                </div>
                <p className="text-4xl font-black text-amber-600 tracking-tight z-10">{formatCurrencyM(capitalPropio)}</p>
                <div className="text-xs text-amber-800/70 mt-2 font-bold z-10 flex items-center gap-1">
                  <AlertCircle size={14} /> Capital a recuperar prioritario
                </div>
              </div>
            </div>

            {/* GRÁFICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* MIX DE CAPITAL */}
              <div className="bg-white p-7 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col items-center">
                <h3 className="text-slate-900 font-black text-lg w-full mb-2">Mezcla de Capital</h3>
                <p className="text-slate-500 text-xs font-semibold w-full mb-6">Origen de los fondos del inventario</p>
                
                <div className="flex w-full items-center">
                  <div className="h-[250px] w-1/2 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mixCapitalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
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
                  </div>

                  <div className="w-1/2 pl-6 space-y-4">
                    {mixCapitalData.map(item => (
                      <div key={item.name} className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></span>
                          <span className="text-sm font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="text-lg font-black text-slate-900 leading-none">{formatCurrencyM(item.value)}</span>
                        <span className="text-xs font-semibold text-slate-400 mt-1">{(((item.value / inversionTotal) * 100) || 0).toFixed(1)}% del total</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AGING DE INVENTARIO */}
              <div className="bg-white p-7 rounded-[1.5rem] shadow-sm border border-slate-200">
                <h3 className="text-slate-900 font-black text-lg mb-2">Antigüedad del Inventario (Aging)</h3>
                <p className="text-slate-500 text-xs font-semibold w-full mb-6">Distribución de unidades por días de antigüedad</p>
                <div className="h-[220px] w-full">
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

            </div>

            {/* TABLA DE DETALLE */}
            <div className="bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-200 flex flex-col min-h-[500px]">
              <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 bg-white border-b border-slate-100">
                <h3 className="text-slate-900 font-black text-lg flex items-center gap-2">
                  Detalle de Unidades ({tableData.length})
                </h3>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar submarca, versión, color..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-11 pr-5 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto relative bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#f8fafc] text-[11px] uppercase text-slate-500 font-black border-y border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Submarca</th>
                      <th className="px-6 py-4">Versión</th>
                      <th className="px-6 py-4">Color</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Antigüedad Promedio</th>
                      <th className="px-6 py-4 text-right">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.slice(0, 150).map((row, idx) => {
                      const antiguedad = row['Antigüedad Num'];
                      const isAlert = antiguedad > 75; // Resaltar vibrante > 75 días
                      
                      return (
                        <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isAlert ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent'}`}>
                          <td className="px-6 py-4 text-slate-700 font-bold whitespace-nowrap">{row['Sucursal'] || '-'}</td>
                          <td className="px-6 py-4 font-black text-slate-900">{row['Submarca'] || '-'}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600 max-w-[200px] truncate" title={row['Versión']}>{row['Versión'] || '-'}</td>
                          <td className="px-6 py-4 text-slate-700 font-medium">{row['Color'] || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            {/* BADGE DE ESTADO */}
                            {row.tipoCapital === 'P' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Propia</span>}
                            {row.tipoCapital === 'F' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Financiada</span>}
                            {row.tipoCapital === 'D' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-200">Demo</span>}
                            {row.tipoCapital === '-' && <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isAlert ? (
                              <span className="inline-flex items-center justify-center px-3 py-1 bg-red-600 text-white font-black text-sm rounded-lg shadow-md shadow-red-600/30">
                                {antiguedad} días
                              </span>
                            ) : (
                              <span className="font-bold text-slate-700">{antiguedad} días</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatCurrencyNormal(row['Costo Total Num'])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {tableData.length > 150 && (
                <div className="p-4 text-center text-sm font-semibold text-slate-500 bg-slate-50">
                  Mostrando 150 de {tableData.length} registros. Utilice la búsqueda para ver más.
                </div>
              )}
            </div>

          </>
        )}

      </div>
    </div>
  );
}
