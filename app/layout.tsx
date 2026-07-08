import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppHeader } from '../components/layout/AppHeader';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Daytona BI Hub',
  description: 'Portal de Inteligencia de Negocios — Grupo Daytona',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex flex-col h-screen w-full bg-[#F4F6F8] overflow-hidden font-sans">
        <AppHeader />
        <main className="flex-1 w-full overflow-y-auto bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
