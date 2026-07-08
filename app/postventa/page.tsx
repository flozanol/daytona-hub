import { ExternalDashboard } from '../../components/shared/ExternalDashboard';

export const metadata = { title: 'Postventa — Daytona BI' };

export default function PostventaPage() {
  return (
    <ExternalDashboard
      src="https://daytona-postventa-kpis.vercel.app/"
      title="Dashboard Postventa"
      label="Postventa"
    />
  );
}
