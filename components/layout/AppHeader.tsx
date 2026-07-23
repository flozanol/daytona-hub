'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Car, Key, Wrench, Megaphone, LayoutDashboard,
  Factory, LogOut, ClipboardCheck, Menu, X, ClipboardList, PieChart,
} from 'lucide-react';
import { logout } from '@/app/actions/auth';
import type { AuthUser } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/',            label: 'Centro de Comando', Icon: LayoutDashboard },
  { href: '/nuevos',      label: 'Autos Nuevos',       Icon: Car             },
  { href: '/seminuevos',  label: 'Seminuevos',          Icon: Key             },
  { href: '/postventa',   label: 'Postventa',           Icon: Wrench          },
  { href: '/marketing',   label: 'Marketing',           Icon: Megaphone       },
  { href: '/yakimura',    label: 'Yakimura',            Icon: Factory         },
  { href: '/checklist',        label: 'Checklist',        Icon: ClipboardCheck  },
  { href: '/encuestas',        label: 'Encuestas',        Icon: ClipboardList   },
  { href: '/reporte-rotacion', label: 'Rpt. Rotación',   Icon: PieChart        },
] as const;

interface AppHeaderProps {
  user: AuthUser;
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[#003366] text-white shadow-lg z-30 shrink-0 relative">

      {/* Barra principal */}
      <div className="flex items-center gap-3 px-4 py-2.5 h-14">

        {/* Logo + Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="https://grupodaytona.com/_next/image?url=https%3A%2F%2Fapi.grupodaytona.com%2Ffiles%2Fimages%2Ffull-xzLxpZqXUE-1728519042236.png&w=384&q=75"
            alt="Daytona"
            className="w-24 shrink-0"
          />
          <div className="hidden sm:block h-6 w-px bg-white/20" />
          <span className="hidden sm:block font-bold tracking-widest text-xs uppercase text-white/80 whitespace-nowrap">
            BI Hub
          </span>
        </div>

        {/* Nav — solo desktop */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center min-w-0">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-white text-[#003366] shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Usuario + Logout — desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="text-right leading-tight">
            <p className="text-xs font-semibold text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[10px] text-white/50 uppercase tracking-wide">
              {user.jobTitle ?? user.department}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>

        {/* Hamburguesa — solo móvil */}
        <div className="md:hidden flex items-center gap-2 ml-auto">
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Menú"
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* Menú móvil desplegable */}
      {open && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#003366] border-t border-white/10 shadow-xl z-40">

          {/* Info de usuario */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wide truncate">
                {user.jobTitle ?? user.department}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                <LogOut size={13} /> Salir
              </button>
            </form>
          </div>

          {/* Nav items */}
          <nav className="py-2">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon size={18} />
                  {label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

    </header>
  );
}
