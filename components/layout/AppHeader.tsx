'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, Key, Wrench, Megaphone, LayoutDashboard, Factory } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',           label: 'Centro de Comando', Icon: LayoutDashboard },
  { href: '/nuevos',     label: 'Autos Nuevos',       Icon: Car             },
  { href: '/seminuevos', label: 'Seminuevos',          Icon: Key             },
  { href: '/postventa',  label: 'Postventa',           Icon: Wrench          },
  { href: '/marketing',  label: 'Marketing',           Icon: Megaphone       },
  { href: '/yakimura',   label: 'Yakimura',            Icon: Factory         },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-[#003366] text-white shadow-lg z-20 shrink-0">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 py-3">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <img
            src="https://grupodaytona.com/_next/image?url=https%3A%2F%2Fapi.grupodaytona.com%2Ffiles%2Fimages%2Ffull-xzLxpZqXUE-1728519042236.png&w=384&q=75"
            alt="Daytona"
            className="w-32"
          />
          <div className="h-8 w-px bg-white/20 hidden md:block" />
          <span className="hidden md:block font-bold tracking-widest text-sm uppercase text-white/90">
            Business Intelligence Hub
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-white text-[#003366] shadow-md scale-105'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
