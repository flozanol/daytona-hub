import { ExternalDashboard } from '../../components/shared/ExternalDashboard';

export const metadata = { title: 'Marketing — Daytona BI' };

export default function MarketingPage() {
  const src = process.env.MARKETING_DASHBOARD_URL ?? 'https://daytona-marketing-dashboard.vercel.app/';
  return <ExternalDashboard src={src} title="Dashboard Marketing" label="Marketing" />;
}
