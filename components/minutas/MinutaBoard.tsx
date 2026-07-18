'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, ShieldAlert, CheckCircle2, Clock,
  AlertCircle, Printer, Save, X,
} from 'lucide-react';
import { AdminModal } from './AdminModal';
import {
  Minuta, getMinutas, addMinuta, deleteMinuta, updateMinuta,
} from '../../app/actions/minutas';

type PendingAction = { type: 'add' | 'delete' | 'update'; payload: unknown };

const STATUS_COLORS: Record<string, string> = {
  'Completado': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'En Progreso': 'bg-blue-100 text-blue-800 border-blue-200',
  'Pendiente':   'bg-amber-100 text-amber-800 border-amber-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'Completado':  <CheckCircle2 size={14} className="mr-1" />,
  'En Progreso': <Clock size={14} className="mr-1" />,
  'Pendiente':   <AlertCircle size={14} className="mr-1" />,
};

const AREAS = ['Ventas', 'Seminuevos', 'Postventa', 'Marketing', 'General'] as const;

const DEFAULT_NEW_TASK: Partial<Minuta> = {
  accion: '',
  responsable: '',
  fecha_limite: new Date().toISOString().split('T')[0],
  estado: 'Pendiente',
  area: 'General',
};

export function MinutaBoard() {
  const [minutas, setMinutas]         = useState<Minuta[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [pending, setPending]         = useState<PendingAction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editForm, setEditForm]       = useState<Partial<Minuta>>({});
  const [newTask, setNewTask]         = useState<Partial<Minuta>>(DEFAULT_NEW_TASK);
  const [filterArea, setFilterArea]   = useState<string>('Todas');

  const fetchMinutas = useCallback(async () => {
    setLoading(true);
    const data = await getMinutas();
    setMinutas(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMinutas(); }, [fetchMinutas]);

  const requestAction = (type: PendingAction['type'], payload: unknown) => {
    setPending({ type, payload });
    setModalOpen(true);
  };

  const executeAction = async (pin: string) => {
    if (!pending) return;
    try {
      if (pending.type === 'add') {
        const added = await addMinuta(pending.payload as Omit<Minuta, 'id' | 'created_at'>, pin);
        if (added) { await fetchMinutas(); setShowAddForm(false); setNewTask(DEFAULT_NEW_TASK); }
      } else if (pending.type === 'delete') {
        await deleteMinuta((pending.payload as { id: string }).id, pin);
        await fetchMinutas();
      } else if (pending.type === 'update') {
        const { id, updates } = pending.payload as { id: string; updates: Partial<Minuta> };
        await updateMinuta(id, updates, pin);
        await fetchMinutas();
      }
      setModalOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      alert(`Error: ${msg}`);
    }
  };

  const filtered = filterArea === 'Todas' ? minutas : minutas.filter(m => m.area === filterArea);

  const statusColor = (e: string) => STATUS_COLORS[e] ?? STATUS_COLORS['Pendiente'];
  const statusIcon  = (e: string) => STATUS_ICONS[e] ?? STATUS_ICONS['Pendiente'];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mt-10 print:shadow-none print:border-none print:p-0 print:mt-0">

      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-2">📌 Minuta y Plan de Acción</h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Lista de acuerdos y tareas a ejecutar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {['Todas', ...AREAS].map(area => (
            <button key={area} onClick={() => setFilterArea(area)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterArea === area ? 'bg-[#003366] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {area}
            </button>
          ))}
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-300 shadow-sm transition-colors">
            <Printer size={16} strokeWidth={3} /> Imprimir
          </button>
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-sm transition-colors">
            <Plus size={16} strokeWidth={3} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* FORM NUEVA TAREA */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-8 animate-in slide-in-from-top-4 fade-in duration-300 print:hidden">
          <h3 className="text-[#003366] font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
            Agregar Nuevo Acuerdo <ShieldAlert size={14} className="text-red-500" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Acuerdo / Acción</label>
              <input type="text" value={newTask.accion ?? ''}
                onChange={e => setNewTask(p => ({ ...p, accion: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                placeholder="Ej. Revisar cotizaciones pendientes..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Responsable</label>
              <input type="text" value={newTask.responsable ?? ''}
                onChange={e => setNewTask(p => ({ ...p, responsable: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                placeholder="Nombre" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Área / Depto</label>
              <select value={newTask.area ?? 'General'}
                onChange={e => setNewTask(p => ({ ...p, area: e.target.value as Minuta['area'] }))}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none font-medium">
                {AREAS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Fecha Límite</label>
              <input type="date" value={newTask.fecha_limite ?? ''}
                onChange={e => setNewTask(p => ({ ...p, fecha_limite: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none font-medium text-gray-700" />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!newTask.accion || !newTask.responsable) {
                  alert('Completa la acción y el responsable');
                  return;
                }
                requestAction('add', newTask);
              }}
              className="px-5 py-2 bg-[#003366] text-white text-sm font-bold rounded-xl hover:bg-[#002244] transition shadow-sm">
              Guardar y Proteger
            </button>
          </div>
        </div>
      )}

      {/* TABLA */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]" />
            <p className="text-xs font-bold text-[#003366] mt-2 uppercase">Cargando Minutas...</p>
          </div>
        )}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Acción / Tarea','Área','Responsable','Fecha Límite','Estado','Admin'].map(h => (
                <th key={h} className={`py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest ${h === 'Admin' ? 'w-20 text-center print:hidden' : ''} ${h === 'Estado' ? 'print:hidden' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400 font-medium text-sm">No hay minutas registradas en esta vista.</td></tr>
            )}
            {filtered.map(minuta =>
              editingId === minuta.id ? (
                <tr key={minuta.id} className="bg-blue-50/30">
                  <td className="py-3 px-4">
                    <textarea value={editForm.accion ?? ''} onChange={e => setEditForm(p => ({ ...p, accion: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none font-medium resize-y min-h-[60px]" />
                  </td>
                  <td className="py-3 px-4">
                    <select value={editForm.area ?? 'General'} onChange={e => setEditForm(p => ({ ...p, area: e.target.value as Minuta['area'] }))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none">
                      {AREAS.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <input type="text" value={editForm.responsable ?? ''} onChange={e => setEditForm(p => ({ ...p, responsable: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none font-bold" />
                  </td>
                  <td className="py-3 px-4">
                    <input type="date" value={editForm.fecha_limite ?? ''} onChange={e => setEditForm(p => ({ ...p, fecha_limite: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusColor(minuta.estado)}`}>{minuta.estado}</span>
                  </td>
                  <td className="py-3 px-4 print:hidden">
                    <div className="flex justify-center items-center gap-2">
                      <button onClick={() => { requestAction('update', { id: minuta.id, updates: editForm }); setEditingId(null); }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Guardar">
                        <Save size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition" title="Cancelar">
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={minuta.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium whitespace-pre-wrap print:text-black min-w-[200px]">{minuta.accion}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200 print:text-black print:border-none print:p-0 print:bg-transparent">
                      {minuta.area}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 font-bold print:text-black">{minuta.responsable}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 font-medium print:text-black">
                    {new Date(minuta.fecha_limite).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 print:hidden">
                    <select value={minuta.estado}
                      onChange={e => requestAction('update', { id: minuta.id, updates: { estado: e.target.value } })}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border outline-none cursor-pointer appearance-none ${statusColor(minuta.estado)}`}>
                      <option>Pendiente</option>
                      <option>En Progreso</option>
                      <option>Completado</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 print:hidden">
                    <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(minuta.id);
                          setEditForm({
                            accion: minuta.accion, area: minuta.area, responsable: minuta.responsable,
                            fecha_limite: minuta.fecha_limite ? new Date(minuta.fecha_limite).toISOString().split('T')[0] : '',
                            estado: minuta.estado,
                          });
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => requestAction('delete', { id: minuta.id })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Borrar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={executeAction}
        actionText={
          pending?.type === 'add'    ? 'agregar esta tarea' :
          pending?.type === 'delete' ? 'borrar permanentemente esta tarea' :
                                       'modificar esta tarea'
        }
      />
    </div>
  );
}
