import Link from 'next/link';
import { Car, Key, Wrench, Megaphone, LayoutDashboard, Factory, Database, Target, ArrowRight } from 'lucide-react';
import { MinutaBoard } from '../components/minutas/MinutaBoard';

const MODULES = [
  {
    href: '/nuevos',
    label: 'Autos Nuevos',
    Icon: Car,
    status: 'Conectado (API Sheets + SQL Server)',
  },
  {
    href: '/seminuevos',
    label: 'Seminuevos',
    Icon: Key,
    status: 'Conectado (API Sheets)',
  },
  {
    href: '/postventa',
    label: 'Postventa',
    Icon: Wrench,
    status: 'Conectado (CSV Hub)',
  },
  {
    href: '/marketing',
    label: 'Marketing',
    Icon: Megaphone,
    status: 'Conectado (Supabase DB)',
  },
  {
    href: '/yakimura',
    label: 'Yakimura',
    Icon: Factory,
    status: 'Conectado (SQL Server)',
  },
] as const;

export default function ResumenPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-in fade-in duration-500">
      {/* Hero */}
      <div className="mb-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-[#003366]">
          <LayoutDashboard size={180} />
        </div>
        <div className="relative z-10">
          <span className="bg-blue-50 text-[#003366] text-xs font-black uppercase px-3 py-1.5 rounded-full tracking-widest border border-blue-100">
            PLATAFORMA ACTIVA: Centralización Completada
          </span>
          <h1 className="text-4xl font-black text-[#003366] tracking-tight mt-4">
            Bienvenido al Portal de Inteligencia Daytona
          </h1>
          <p className="text-gray-600 font-medium mt-2 max-w-3xl leading-relaxed">
            Accede a los dashboards de Nuevos, Seminuevos, Postventa, Marketing y Yakimura
            desde el menú superior. La información se actualiza en tiempo real.
          </p>
        </div>
      </div>

      {/* Módulos */}
      <div className="mb-10">
        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Target size={18} className="text-[#fd0019]" />
          Acceso Instantáneo a Datos Reales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {MODULES.map(({ href, label, Icon, status }) => (
            <Link
              key={href}
              href={href}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-5">
                <div className="bg-blue-50 p-3 rounded-xl text-[#003366]">
                  <Icon size={22} />
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-[#fd0019] transition-colors" />
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">{label}</h3>
              <p className="text-xs font-bold text-emerald-600 mt-1.5 flex items-center gap-1.5">
                <Database size={12} />
                {status}
              </p>
              <p className="text-sm text-gray-500 mt-3 font-medium">
                Haga clic para ver el desglose detallado.
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Minutas */}
      <MinutaBoard />
    </div>
  );
}
