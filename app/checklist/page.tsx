import { Suspense } from 'react';
import { getUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { ChecklistListClient } from '@/components/checklist/ChecklistListClient';
import { AdminWeekHubClient } from '@/components/checklist/AdminWeekHubClient';
import { Loader2 } from 'lucide-react';

export default async function ChecklistPage() {
  const user = await getUser();
  const admin = user ? isAdmin(user.email) : false;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {admin ? (
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          }
        >
          <AdminWeekHubClient />
        </Suspense>
      ) : (
        <ChecklistListClient />
      )}
    </div>
  );
}
