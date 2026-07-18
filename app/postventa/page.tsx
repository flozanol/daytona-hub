import { ExternalDashboard } from '../../components/shared/ExternalDashboard';

export const metadata = { title: 'Postventa — Daytona BI' };

export default function PostventaPage() {
  const src = process.env.POSTVENTA_DASHBOARD_URL ?? 'https://daytona-postventa-kpis.vercel.app/';
  return <ExternalDashboard src={src} title="Dashboard Postventa" label="Postventa" />;
}
