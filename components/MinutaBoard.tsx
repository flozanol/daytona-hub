'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import AdminModal from './AdminModal';
import { Minuta, getMinutas, addMinuta, deleteMinuta, updateMinuta } from '../app/actions/minutas';

export default function MinutaBoard() {
  const [minutas, setMinutas] = useState<Minuta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'add' | 'delete' | 'update', payload?: any} | null>(null);
  
  // New Task Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Minuta>>({
    accion: '',
    responsable: '',
    fecha_limite: new Date().toISOString().split('T')[0],
    estado: 'Pendiente',
    area: 'General'
  });

  const [filterArea, setFilterArea] = useState<string>('Todas');

  const fetchMinutas = useCallback(async () => {
    setLoading(true);
    const data = await getMinutas();
    setMinutas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMinutas();
  }, [fetchMinutas]);

  const handleActionRequest = (type: 'add' | 'delete' | 'update', payload: any) => {
    setPendingAction({ type, payload });
    setModalOpen(true);
  };

  const executeAction = async (pin: string) => {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'add') {
        const added = await addMinuta(pendingAction.payload as Omit<Minuta, 'id' | 'created_at'>, pin);
        if(added) await fetchMinutas();
        setShowAddForm(false);
        setNewTask({ ...newTask, accion: '', responsable: '' }); // reset form
      } else if (pendingAction.type === 'delete') {
        await deleteMinuta(pendingAction.payload.id, pin);
        await fetchMinutas();
      } else if (pendingAction.type === 'update') {
        await updateMinuta(pendingAction.payload.id, pendingAction.payload.updates, pin);
        await fetchMinutas();
      }
      setModalOpen(false);
    } catch (e: any) {
      alert(`Error: ${e.message || 'PIN Incorrecto o Error de Conexión'}`);
    }
  };

  const filteredMinutas = filterArea === 'Todas' 
    ? minutas 
    : minutas.filter(m => m.area === filterArea);

  const getStatusColor = (estado: string) => {
    switch(estado) {
      case 'Completado': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'En Progreso': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch(estado) {
      case 'Completado': return <CheckCircle2 size={14} className="mr-1" />;
      case 'En Progreso': return <Clock size={14} className="mr-1" />;
      default: return <AlertCircle size={14} className="mr-1" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mt-10">
      
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-2">
            📌 Minuta y Plan de Acción
          </h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Lista de acuerdos y tareas a ejecutar.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['Todas', 'Ventas', 'Seminuevos', 'Postventa', 'Marketing', 'General'].map(area => (
            <button
              key={area}
              onClick={() => setFilterArea(area)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterArea === area 
                  ? 'bg-[#003366] text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {area}
            </button>
          ))}
          
          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-sm transition-colors"
          >
            <Plus size={16} strokeWidth={3} />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Add Task Form Workflow */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
          <h3 className="text-[#003366] font-bold text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
           Agregar Nuevo Acuerdo
           <ShieldAlert size={14} className="text-red-500" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Acuerdo / Acción</label>
              <input 
                type="text" 
                value={newTask.accion}
                onChange={e => setNewTask({...newTask, accion: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                placeholder="Ej. Revisar cotizaciones pendientes..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Responsable</label>
              <input 
                type="text" 
                value={newTask.responsable}
                onChange={e => setNewTask({...newTask, responsable: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Área / Depto</label>
              <select 
                value={newTask.area}
                onChange={e => setNewTask({...newTask, area: e.target.value as any})}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none font-medium"
              >
                <option value="Ventas">Ventas</option>
                <option value="Seminuevos">Seminuevos</option>
                <option value="Postventa">Postventa</option>
                <option value="Marketing">Marketing</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Fecha Límite</label>
              <input 
                type="date" 
                value={newTask.fecha_limite}
                onChange={e => setNewTask({...newTask, fecha_limite: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366] outline-none font-medium text-gray-700"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3">
             <button 
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition"
              >
               Cancelar
             </button>
             <button 
                onClick={() => {
                  if(!newTask.accion || !newTask.responsable) { alert("Completa la acción y el responsable"); return; }
                  handleActionRequest('add', newTask);
                }}
                className="px-5 py-2 bg-[#003366] text-white text-sm font-bold rounded-xl hover:bg-[#002244] transition shadow-sm"
              >
               Guardar y Proteger
             </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm relative min-h-[200px]">
        {loading && (
           <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div>
             <p className="text-xs font-bold text-[#003366] mt-2 uppercase">Cargando Minutas...</p>
           </div>
        )}
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest">Acción / Tarea</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest">Área</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest">Responsable</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest">Fecha Límite</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest">Estado</th>
              <th className="py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-widest w-20 text-center">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMinutas.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400 font-medium text-sm">
                  No hay minutas registradas en esta vista.
                </td>
              </tr>
            )}
            {filteredMinutas.map(minuta => (
              <tr key={minuta.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="py-3 px-4 text-sm text-gray-900 font-medium max-w-xs truncate" title={minuta.accion}>
                  {minuta.accion}
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                    {minuta.area}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 font-bold">
                  {minuta.responsable}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500 font-medium">
                  {new Date(minuta.fecha_limite).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <select 
                    value={minuta.estado}
                    onChange={(e) => handleActionRequest('update', { id: minuta.id, updates: { estado: e.target.value }})}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border outline-none cursor-pointer appearance-none ${getStatusColor(minuta.estado)}`}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleActionRequest('delete', { id: minuta.id })}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Borrar Tarea">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSubmit={executeAction}
        actionText={
          pendingAction?.type === 'add' ? 'agregar esta tarea' : 
          pendingAction?.type === 'delete' ? 'borrar permanentemente esta tarea' : 
          'modificar esta tarea'
        }
      />
    </div>
  );
}
