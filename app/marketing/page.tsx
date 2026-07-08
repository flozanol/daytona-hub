import { ExternalDashboard } from '../../components/shared/ExternalDashboard';

export const metadata = { title: 'Marketing — Daytona BI' };

export default function MarketingPage() {
  return (
    <ExternalDashboard
      src="https://daytona-marketing-dashboard.vercel.app/"
      title="Dashboard Marketing"
      label="Marketing"
    />
  );
}
