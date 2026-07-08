import { ExternalDashboard } from '../../components/shared/ExternalDashboard';

export const metadata = { title: 'Seminuevos — Daytona BI' };

export default function SeminuevosPage() {
  return (
    <ExternalDashboard
      src="https://flozanol.github.io/daytona-seminuevos-kpis/"
      title="Dashboard Seminuevos"
      label="Seminuevos"
    />
  );
}
