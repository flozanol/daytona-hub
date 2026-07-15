import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { ChecklistAdminClient } from '@/components/checklist/ChecklistAdminClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ChecklistAdminPage() {
  const user = await getUser();
  if (!user || !isAdmin(user.email)) redirect('/checklist');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Link
        href="/checklist"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={14} /> Volver a Checklist
      </Link>
      <ChecklistAdminClient />
    </div>
  );
}
