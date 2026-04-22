'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Search, Database, Filter, Clock, BadgeDollarSign, Car, BarChart3, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const getCategoryBadge = (cat: string) => {
  const styles: Record<string, string> = {
    'DEMO PROPIO': 'bg-pink-600 text-white shadow-sm',
    'DEMO': 'bg-purple-500 text-white shadow-sm',
    'PROPIO': 'bg-amber-500 text-white shadow-sm',
    'FINANCIADO': 'bg-blue-600 text-white shadow-sm'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${styles[cat] || 'bg-slate-400'}`}>
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
    
    // Empezamos desde la fila 1 para saltar encabezados
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 15) continue;

      // MAPEO POR COORDENADAS EXACTAS
      const sucursal = String(row[0] || '').trim();
      const submarca = String(row[2] || '').trim();
      const version  = String(row[3] || '').trim();
      const color    = String(row[4] || '').trim();
      const age      = parseInt(row[13]) || 0; // Columna N

      // FILTRO DE SEGURIDAD ABSOLUTO
      // Si el color es "Total", o la submarca es "Total", o no hay color... ES UN RESUMEN. LO MATAMOS.
      if (!color || color.toLowerCase().includes('total') || submarca.toLowerCase().includes('total') || sucursal.toLowerCase().includes('total')) {
        continue;
      }

      const parseMoney = (val: any) => parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;

      // CONFIGURACIÓN DE COLUMNAS SEGÚN TU EXPLICACIÓN
      const categories = [
        { qIdx: 5,  cIdx: 6,  label: 'FINANCIADO' },    // F y G
        { qIdx: 7,  cIdx: 8,  label: 'DEMO' },          // H e I
        { qIdx: 9,  cIdx: 10, label: 'PROPIO' },        // J y K
        { qIdx: 11, cIdx: 12, label: 'DEMO PROPIO' }    // L y M
      ];

      categories.forEach(cat => {
        const qty = parseInt(row[cat.qIdx]) || 0;
        const totalCost = parseMoney(row[cat.cIdx]);
        
        if (qty > 0) {
          // EXPLOSIÓN DE UNIDADES: Si dice 2, creamos 2 registros.
          for (let j = 0; j < qty; j++) {
            units.push({
              sucursal,
              submarca,
              version,
              color,
              categoria: cat.label,
              costo: totalCost / qty,
              antiguedad: age
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
        header: false, // OBLIGAMOS A LEER POR ÍNDICE, NO POR NOMBRE
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
    let res = data;
    if (selectedAgencia !== 'Todas') res = res.filter(d => d.sucursal === selectedAgencia);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      res = res.filter(d => d.submarca.toLowerCase().includes(s) || d.color.toLowerCase().includes(s));
    }
    return res;
  }, [data, selectedAgencia, searchTerm]);

  const stats = useMemo(() => {
    const s = { uds: 0, total: 0, fin: 0, prop: 0, demo: 0, dProp: 0 };
    filteredData.forEach(d => {
      s.uds++;
      s.total += d.costo;
      if (d.categoria === 'FINANCIADO') s.fin += d.costo;
      if (d.categoria === 'PROPIO') s.prop += d.costo;
      if (d.categoria === 'DEMO') s.demo += d.costo;
      if (d.categoria === 'DEMO PROPIO') s.dProp += d.costo;
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
    { name: 'Demo Propio', value: stats.dProp, fill: '#ec4899' }
  ], [stats]);

  const muro = useMemo(() => [...filteredData].sort((a, b) => b.antiguedad - a.antiguedad).slice(0, 10), [filteredData]);

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-black italic">DAYTONA <span className="text-blue-600 not-italic uppercase tracking-tighter">Inventario Nuevos</span></h1>
          <div className="flex gap-2">
            <select 
              className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold outline-none ring-blue-500 focus:ring-2"
              value={selectedAgencia} onChange={e => setSelectedAgencia(e.target.value)}
            >
              {['Todas', ...Array.from(new Set(data.map(d => d.sucursal))).sort()].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <label className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-black transition-colors">
              Cargar CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {isLoaded && (
          <>
            {/* CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Unidades</p>
                <p className="text-3xl font-black">{stats.uds}</p>
              </div>
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Monto Total</p>
                <p className="text-2xl font-black text-blue-600">{fmt(stats.total)}</p>
              </div>
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-pink-100 bg-pink-50/20">
                <p className="text-[10px] font-black text-pink-400 uppercase mb-1">Demos Propios</p>
                <p className="text-2xl font-black text-pink-600">{fmt(stats.dProp)}</p>
              </div>
              <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-amber-100 bg-amber-50/20">
                <p className="text-[10px] font-black text-amber-400 uppercase mb-1">Costo Propios</p>
                <p className="text-2xl font-black text-amber-600">{fmt(stats.prop)}</p>
              </div>
            </div>

            {/* MURO */}
            <div className="bg-white p-6 rounded-[2rem] border-2 border-red-500 shadow-xl shadow-red-50">
              <h2 className="text-red-600 font-black uppercase text-lg mb-4 flex items-center gap-2 tracking-tighter">
                <ShieldAlert size={20} /> Muro de los Lamentos (Unidades más antiguas)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 font-black uppercase border-b border-slate-50">
                      <th className="pb-3 px-2">Agencia</th>
                      <th className="pb-3 px-2">Modelo</th>
                      <th className="pb-3 px-2">Categoría</th>
                      <th className="pb-3 px-2 text-right">Días de Piso</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold">
                    {muro.map((u, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="py-3 px-2 text-slate-400">{u.sucursal}</td>
                        <td className="py-3 px-2">{u.modelo}</td>
                        <td className="py-3 px-2">{getCategoryBadge(u.categoria)}</td>
                        <td className="py-3 px-2 text-right text-red-600 text-base">{u.antiguedad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GRÁFICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                <h3 className="font-black text-xs uppercase text-slate-400 mb-6 flex items-center gap-2"><Clock size={14}/> Aging (Unidades por días)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agingChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={40}>
                        {agingChart.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                <h3 className="font-black text-xs uppercase text-slate-400 mb-6 flex items-center gap-2"><BarChart3 size={14}/> Mezcla de Capital (Monto)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={capitalChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {capitalChart.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 text-[9px] font-black uppercase text-slate-400">
                   {capitalChart.map(c => <div key={c.name} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: c.fill}} /> {c.name}</div>)}
                </div>
              </div>
            </div>

            {/* LISTA TOTAL */}
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-black text-lg">Inventario Detallado ({filteredData.length} unidades)</h3>
                <input 
                  type="text" placeholder="Buscar..."
                  className="bg-white border rounded-xl px-4 py-2 text-sm outline-none w-48 md:w-64 font-bold focus:ring-2 ring-blue-500"
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 font-black uppercase sticky top-0 z-20">
                    <tr>
                      <th className="px-6 py-4">Agencia</th>
                      <th className="px-6 py-4">Modelo</th>
                      <th className="px-6 py-4 text-center">Categoría</th>
                      <th className="px-6 py-4 text-center">Días</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {filteredData.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{u.sucursal}</td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900">{u.modelo}</div>
                          <div className="text-[10px] text-slate-300 truncate max-w-[150px]">{u.color}</div>
                        </td>
                        <td className="px-6 py-4 text-center">{getCategoryBadge(u.categoria)}</td>
                        <td className={`px-6 py-4 text-center ${u.antiguedad > 75 ? 'text-red-500' : 'text-slate-700'}`}>{u.antiguedad}</td>
                        <td className="px-6 py-4 text-right text-slate-900">{fmt(u.costo)}</td>
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
