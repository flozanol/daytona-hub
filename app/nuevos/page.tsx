import { AutosNuevosWrapper } from '../../components/nuevos/AutosNuevosWrapper';

export const metadata = { title: 'Autos Nuevos — Daytona BI' };

export default function NuevosPage() {
  const dashboardUrl = process.env.NUEVOS_DASHBOARD_URL ?? 'https://flozanol.github.io/daytona-autos-nuevos-kpis/';
  return <AutosNuevosWrapper dashboardUrl={dashboardUrl} />;
}
