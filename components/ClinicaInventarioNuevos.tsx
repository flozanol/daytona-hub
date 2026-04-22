'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, TrendingUp, Filter, Clock, BadgeDollarSign, Car, BarChart3, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// Estilos de etiquetas para categorías
const getCategoryBadge = (cat: string) => {
  const styles: Record<string, string> = {
    'DEMO PROPIO': 'bg-pink-100 text-pink-800 border-pink-200',
    'DEMO': 'bg-purple-100 text-purple-800 border-purple-200',
    'PROPIO': 'bg-amber-100 text-amber-800 border-amber-200',
    'FINANCIADO': 'bg-blue-100 text-blue-800 border-blue-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border uppercase tracking-widest ${styles[cat] || 'bg-slate-100 text-slate-600'}`}>
      {cat}
    </span>
  );
};

export default function ClinicaInventarioNuevos() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  const processDaytonaData = (rows: any[]) => {
    const units: any[] = [];
    
    // Saltamos la primera fila (encabezados)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // ÍNDICES BASADOS EN TU EXPLICACIÓN (F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13)
      const sucursal = row[0];
      const submarca = row[2];
      const version = row[3];
      const color = row[4];
      const antiguedad = parseInt(row[13]) || 0;

      // REGLA DE ORO: Solo procesamos filas que NO sean totales
      // Si la columna de color o submarca dice "Total" o está vacía, es un resumen y lo saltamos
      if (!color || color === 'Total' || submarca === 'Total' || sucursal === 'Total') continue;

      const parseMoney = (val: any) => parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;

      // Definimos las cubetas de capital por índice de columna
      const capitalConfig = [
        { qtyIdx: 5,  costIdx: 6,  label: 'FINANCIADO' },    // F y G
        { qtyIdx: 7,  costIdx: 8,  label: 'DEMO' },          // H e I
        { qtyIdx: 9,  costIdx: 10, label: 'PROPIO' },        // J y K
        { qtyIdx: 11, costIdx: 12, label: 'DEMO PROPIO' }    // L y M
      ];

      capitalConfig.forEach(config => {
        const qty = parseInt(row[config.qtyIdx]) || 0;
        const totalCost = parseMoney(row[config.costIdx]);
        
        if (qty > 0) {
          // EXPANDIMOS: Si dice 2 unidades, creamos 2 renglones en la lista
          for (let j = 0; j < qty; j++) {
            units.push({
              sucursal,
              submarca,
              version,
              color,
              categoria: config.label,
              costoIndividual: totalCost / qty,
              antiguedad: antiguedad // Usamos la antigüedad real de este renglón
            });
          }
        }
      });
    }
    return units;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: false, // USAMOS FALSE PARA CONTROLAR POR ÍNDICE
        skipEmptyLines: true,
        complete: (results) => {
          const finalData = processDaytonaData(results.data);
          setData(finalData);
          setIsLoaded(true);
        }
      });
    }
  };

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedAgencia !== 'Todas') result = result.filter(d => d.sucursal === selectedAgencia);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(d => d.submarca?.toLowerCase().includes(s) || d.version?.toLowerCase().includes(s) || d.color?.toLowerCase().includes(s));
    }
    return result;
  }, [data, selectedAgencia, searchTerm]);

  const agencias = useMemo(() => ['Todas', ...Array.from(new Set(data.map(d => d.sucursal))).sort()], [data]);

  const stats = useMemo(() => {
    const s = { uds: 0, total: 0, fin: 0, prop: 0, demo: 0, demoProp: 0 };
    filteredData.forEach(d => {
      s.uds++;
      s.total += d.costoIndividual;
      if (d.categoria === 'FINANCIADO') s.fin += d.costoIndividual;
      if (d.categoria === 'PROPIO') s.prop += d.costoIndividual;
      if (d.categoria === 'DEMO') s.demo += d.costoIndividual;
      if (d.categoria === 'DEMO PROPIO') s.demoProp += d.costoIndividual;
    });
    return s;
  }, [filteredData]);

  const agingChart = useMemo(() => {
    let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
    filteredData.forEach(d => {
      if (d.antiguedad <= 30) b1++;
      else if (d.antiguedad <= 60) b2++;
      else if (d.antiguedad <= 90) b3++;
      else b4++;
    });
    return [
      { name: '0-30', value: b1, fill: '#22c55e' },
      { name: '31-60', value: b2, fill: '#eab308' },
      { name: '61-90', value: b3, fill: '#f97316' },
      { name: '+90', value: b4, fill: '#ef4444' }
    ];
  }, [filteredData]);

  const capitalChart = useMemo(() => [
    { name: 'Financiado', value: stats.fin, fill: '#3b82f6' },
    { name: 'Propio', value: stats.prop, fill: '#f59e0b' },
    { name: 'Demo', value: stats.demo, fill: '#a855f7' },
    { name: 'Demo Propio', value: stats.demoProp, fill: '#ec4899' }
  ], [stats]);

  const muro = useMemo(() => [...filteredData].sort((a, b) => b.antiguedad - a.antiguedad).slice(0, 15), [filteredData]);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
        
        {/* HEADER LIMPIO */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100">
              <Car size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter italic">DAYTONA <span className="text-blue-600 tracking-normal not-italic">NUEVOS</span></h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clínica de Inventario de Precisión</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-blue-500 appearance-none pr-10 min-w-[200px]"
                value={selectedAgencia}
                onChange={(e) => setSelectedAgencia(e.target.value)}
              >
                {agencias.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <Filter className="absolute right-3 top-3 text-slate-400" size={16} />
            </div>
            <label className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
              <Upload size={16} /> Cargar Inventario
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Unidades', val: stats.uds, color: 'text-slate-900', bg: 'bg-white' },
                { label: 'Inversión Total', val: fmt(stats.total), color: 'text-blue-600', bg: 'bg-white' },
                { label: 'Demos Propios', val: fmt(stats.demoProp), color: 'text-pink-600', bg: 'bg-pink-50/30' },
                { label: 'Capital Propio', val: fmt(stats.prop), color: 'text-amber-600', bg: 'bg-amber-50/30' }
              ].map((card, i) => (
                <div key={i} className={`${card.bg} p-6 rounded-3xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]`}>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</p>
                  <p className={`text-3xl font-black ${card.color}`}>{card.val}</p>
                </div>
              ))}
            </div>

            {/* MURO DE LOS LAMENTOS */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-red-500 shadow-2xl shadow-red-50 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="text-red-600" size={32} />
                <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter">Muro de los Lamentos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-300 uppercase font-black">
                    <tr>
                      <th className="pb-4 px-2">Agencia</th>
                      <th className="pb-4 px-2">Modelo / Versión</th>
                      <th className="pb-4 px-2">Color</th>
                      <th className="pb-4 px-2">Categoría</th>
                      <th className="pb-4 px-2 text-right">Antigüedad</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold divide-y divide-slate-50">
                    {muro.map((u, i) => (
                      <tr key={i} className="hover:bg-red-50/30 transition-colors group">
                        <td className="py-4 px-2 text-slate-400 group-hover:text-red-400 transition-colors">{u.sucursal}</td>
                        <td className="py-4 px-2">
                          <div className="text-slate-900">{u.modelo}</div>
                          <div className="text-[9px] text-slate-300 truncate max-w-[150px]">{u.version}</div>
                        </td>
                        <td className="py-4 px-2 text-slate-400">{u.color}</td>
                        <td className="py-4 px-2">{getCategoryBadge(u.categoria)}</td>
                        <td className="py-4 px-2 text-right text-red-600 text-xl font-black">{u.antiguedad} <span className="text-[10px] opacity-50">DÍAS</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GRÁFICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-8 flex items-center gap-2"><Clock size={16}/> Aging Real de Inventario</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} fontWeight="bold" />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={50}>
                        {agingChart.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-8 flex items-center gap-2"><BarChart3 size={16}/> Distribución de Capital</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={capitalChart} innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                        {capitalChart.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-[9px] font-black uppercase text-slate-400 mt-4">
                   {capitalChart.map(c => (
                     <div key={c.name} className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: c.fill}} /> {c.name}
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* TABLA DE INVENTARIO EXPANDIDO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h3 className="font-black text-xl tracking-tight">Inventario Detallado</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrando {filteredData.length} unidades individuales</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-3 text-slate-300" size={18} />
                  <input 
                    type="text" placeholder="Buscar unidad..."
                    className="bg-white border border-slate-200 rounded-2xl px-12 py-2.5 text-sm outline-none w-72 font-bold shadow-sm focus:ring-2 ring-blue-500 transition-all"
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-5">Agencia</th>
                      <th className="px-8 py-5">Modelo / Versión</th>
                      <th className="px-8 py-5 text-center">Categoría</th>
                      <th className="px-8 py-5 text-center">Días</th>
                      <th className="px-8 py-5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {filteredData.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 text-slate-400">{u.sucursal}</td>
                        <td className="px-8 py-5">
                          <div className="text-slate-900">{u.modelo}</div>
                          <div className="text-[10px] text-slate-300">{u.color}</div>
                        </td>
                        <td className="px-8 py-5 text-center">{getCategoryBadge(u.categoria)}</td>
                        <td className={`px-8 py-5 text-center text-lg ${u.antiguedad > 75 ? 'text-red-500' : 'text-slate-700'}`}>{u.antiguedad}</td>
                        <td className="px-8 py-5 text-right text-slate-900 font-black">{fmt(u.costoIndividual)}</td>
                      </tr>
                    ))}
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
