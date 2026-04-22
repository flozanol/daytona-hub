'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, TrendingUp, Filter, Clock, BadgeDollarSign, Car, BarChart3, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

// Componente para las etiquetas de categoría con colores vívidos
const getCategoryBadge = (cat: string) => {
  switch(cat) {
    case 'DEMO PROPIO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-pink-100 text-pink-800 border border-pink-200 uppercase tracking-widest">DEMO PROPIO</span>;
    case 'DEMO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-widest">DEMO</span>;
    case 'PROPIO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-widest">PROPIO</span>;
    case 'FINANCIADO': return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-widest">FINANCIADO</span>;
    default: return <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-widest">{cat}</span>;
  }
};

export default function ClinicaInventarioNuevos() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgencia, setSelectedAgencia] = useState('Todas');
  const [isLoaded, setIsLoaded] = useState(false);

  const processDaytonaData = (rawRows: any[]) => {
    const units: any[] = [];
    
    rawRows.forEach((row) => {
      // 1. FILTRADO QUIRÚRGICO: Ignoramos cualquier fila que sea un resumen
      // Si Submarca o Versión o Color dicen "Total", no es un auto individual, es una suma del sistema.
      const isSummary = 
        row.Submarca === 'Total' || 
        row.Versión === 'Total' || 
        row.Color === 'Total' || 
        !row.Color || 
        row.Sucursal === 'Total';

      if (isSummary) return;

      const parseMoney = (val: any) => parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
      const age = parseInt(row['Antigüedad Promedio']) || 0;

      // 2. EXPANSIÓN DE UNIDADES (La clave para los 17 de Acura)
      // Mapeamos las 4 columnas de capital del archivo original
      const categories = [
        { qty: 'Financiado', cost: 'Costo Financiados', label: 'FINANCIADO' },
        { qty: 'Demo', cost: 'Costo Demo', label: 'DEMO' },
        { qty: 'Propios', cost: 'Costo Propios', label: 'PROPIO' },
        { qty: 'Demo Propios', cost: 'Costo Demo Propios', label: 'DEMO PROPIO' }
      ];

      categories.forEach(cat => {
        const quantity = parseInt(row[cat.qty]) || 0;
        const totalCost = parseMoney(row[cat.cost]);
        
        if (quantity > 0) {
          // Si hay 2 autos en este renglón, creamos 2 objetos independientes
          for (let i = 0; i < quantity; i++) {
            units.push({
              sucursal: row.Sucursal,
              modelo: row.Submarca,
              version: row.Versión,
              color: row.Color,
              categoria: cat.label,
              costoIndividual: totalCost / quantity,
              antiguedad: age
            });
          }
        }
      });
    });

    return units;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processed = processDaytonaData(results.data);
          setData(processed);
          setIsLoaded(true);
        }
      });
    }
  };

  const filteredData = useMemo(() => {
    let result = data;
    if (selectedAgencia !== 'Todas') {
      result = result.filter(d => d.sucursal === selectedAgencia);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.modelo?.toLowerCase().includes(s) || 
        d.version?.toLowerCase().includes(s) ||
        d.color?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [data, selectedAgencia, searchTerm]);

  const agencias = useMemo(() => {
    const set = new Set<string>(data.map(d => d.sucursal));
    return ['Todas', ...Array.from(set).sort()];
  }, [data]);

  const stats = useMemo(() => {
    const s = { uds: 0, total: 0, propio: 0, demo: 0, demoPropio: 0, fin: 0 };
    filteredData.forEach(d => {
      s.uds++;
      s.total += d.costoIndividual;
      if (d.categoria === 'PROPIO') s.propio += d.costoIndividual;
      if (d.categoria === 'FINANCIADO') s.fin += d.costoIndividual;
      if (d.categoria === 'DEMO') s.demo += d.costoIndividual;
      if (d.categoria === 'DEMO PROPIO') s.demoPropio += d.costoIndividual;
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
    { name: 'Propio', value: stats.propio, fill: '#f59e0b' },
    { name: 'Demo', value: stats.demo, fill: '#a855f7' },
    { name: 'Demo Propio', value: stats.demoPropio, fill: '#ec4899' }
  ], [stats]);

  const muro = useMemo(() => {
    return [...filteredData].sort((a, b) => b.antiguedad - a.antiguedad).slice(0, 10);
  }, [filteredData]);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2 italic tracking-tighter">
              <Car className="text-blue-600" /> DAYTONA <span className="text-blue-600">NUEVOS</span>
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Clínica de Inventario Real</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 ring-blue-500"
              value={selectedAgencia}
              onChange={(e) => setSelectedAgencia(e.target.value)}
            >
              {agencias.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-blue-200">
              <Upload size={16} /> Cargar CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Unidades</p>
                <p className="text-3xl font-black">{stats.uds}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Inversión Total</p>
                <p className="text-3xl font-black text-blue-600">{fmt(stats.total)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Demos Propios</p>
                <p className="text-3xl font-black text-pink-600">{fmt(stats.demoPropio)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 bg-amber-50/50">
                <p className="text-amber-600 text-[10px] font-black uppercase tracking-widest mb-1">Capital Propio</p>
                <p className="text-3xl font-black text-amber-600">{fmt(stats.propio)}</p>
              </div>
            </div>

            {/* MURO DE LOS LAMENTOS */}
            <div className="bg-white p-6 rounded-3xl border-2 border-red-500 shadow-xl shadow-red-100">
              <h2 className="text-red-600 font-black uppercase tracking-tighter text-xl mb-4 flex items-center gap-2">
                <ShieldAlert /> Muro de los Lamentos (Unidades Críticas)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase font-black">
                    <tr>
                      <th className="pb-3">Agencia</th>
                      <th className="pb-3">Modelo</th>
                      <th className="pb-3">Color</th>
                      <th className="pb-3">Categoría</th>
                      <th className="pb-3 text-right">Días</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold">
                    {muro.map((u, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="py-3 text-slate-500">{u.sucursal}</td>
                        <td className="py-3">{u.modelo}</td>
                        <td className="py-3 text-slate-400">{u.color}</td>
                        <td className="py-3">{getCategoryBadge(u.categoria)}</td>
                        <td className="py-3 text-right text-red-600 text-lg">{u.antiguedad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GRÁFICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-6">Aging Real (Días de Inventario)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} fontWeight="bold" />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                        {agingChart.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-6">Mezcla de Capital</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={capitalChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {capitalChart.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-[10px] font-black uppercase">
                   {capitalChart.map(c => (
                     <div key={c.name} className="flex items-center gap-1">
                       <div className="w-2 h-2 rounded-full" style={{backgroundColor: c.fill}} /> {c.name}
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* TABLA FINAL */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-lg">Inventario Detallado ({filteredData.length})</h3>
                <input 
                  type="text" placeholder="Buscar unidad..."
                  className="bg-slate-100 border-none rounded-xl px-4 py-2 text-sm outline-none w-64 font-bold"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Agencia</th>
                      <th className="px-6 py-4">Modelo</th>
                      <th className="px-6 py-4">Versión</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4 text-center">Días</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {filteredData.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500">{u.sucursal}</td>
                        <td className="px-6 py-4">{u.modelo}</td>
                        <td className="px-6 py-4 text-[10px] text-slate-400 max-w-[200px] truncate">{u.version}</td>
                        <td className="px-6 py-4">{getCategoryBadge(u.categoria)}</td>
                        <td className={`px-6 py-4 text-center ${u.antiguedad > 90 ? 'text-red-600' : ''}`}>{u.antiguedad}</td>
                        <td className="px-6 py-4 text-right">{fmt(u.costoIndividual)}</td>
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
