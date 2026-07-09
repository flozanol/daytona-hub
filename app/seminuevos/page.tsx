import { ExternalDashboard } from '../../components/shared/ExternalDashboard';

export const metadata = { title: 'Seminuevos — Daytona BI' };

export default function SeminuevosPage() {
  const src = process.env.SEMINUEVOS_DASHBOARD_URL ?? 'https://flozanol.github.io/daytona-seminuevos-kpis/';
  return <ExternalDashboard src={src} title="Dashboard Seminuevos" label="Seminuevos" />;
}
