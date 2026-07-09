'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, Key, Wrench, Megaphone, LayoutDashboard, Factory, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import type { AuthUser } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/',           label: 'Centro de Comando', Icon: LayoutDashboard },
  { href: '/nuevos',     label: 'Autos Nuevos',       Icon: Car             },
  { href: '/seminuevos', label: 'Seminuevos',          Icon: Key             },
  { href: '/postventa',  label: 'Postventa',           Icon: Wrench          },
  { href: '/marketing',  label: 'Marketing',           Icon: Megaphone       },
  { href: '/yakimura',   label: 'Yakimura',            Icon: Factory         },
] as const;

interface AppHeaderProps {
  user: AuthUser;
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-[#003366] text-white shadow-lg z-20 shrink-0">
      <div className="flex items-center gap-3 px-4 py-2.5 h-14">

        {/* Logo + Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="https://grupodaytona.com/_next/image?url=https%3A%2F%2Fapi.grupodaytona.com%2Ffiles%2Fimages%2Ffull-xzLxpZqXUE-1728519042236.png&w=384&q=75"
            alt="Daytona"
            className="w-28 shrink-0"
          />
          <div className="h-6 w-px bg-white/20" />
          <span className="font-bold tracking-widest text-xs uppercase text-white/80 whitespace-nowrap">
            BI Hub
          </span>
        </div>

        {/* Nav — ocupa el espacio disponible y se centra */}
        <nav className="flex items-center gap-0.5 flex-1 justify-center min-w-0">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
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

        {/* Usuario + Logout */}
        <div className="flex items-center gap-2 shrink-0">
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

      </div>
    </header>
  );
}
