import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppHeader } from '@/components/layout/AppHeader';
import { getUser } from '@/lib/auth';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Daytona BI Hub',
  description: 'Portal de Inteligencia de Negocios — Grupo Daytona',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {user ? (
        <body className="flex flex-col h-screen w-full bg-[#F4F6F8] overflow-hidden font-sans">
          <AppHeader user={user} />
          <main className="flex-1 w-full overflow-y-auto bg-gray-50">
            {children}
          </main>
        </body>
      ) : (
        <body className="min-h-screen bg-gray-50 font-sans">
          {children}
        </body>
      )}
    </html>
  );
}
