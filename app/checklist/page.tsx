import { getUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { ChecklistListClient } from '@/components/checklist/ChecklistListClient';

export default async function ChecklistPage() {
  const user = await getUser();
  const admin = user ? isAdmin(user.email) : false;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ChecklistListClient isAdmin={admin} />
    </div>
  );
}
