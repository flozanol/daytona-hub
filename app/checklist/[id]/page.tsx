import { getUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { ChecklistDetailClient } from '@/components/checklist/ChecklistDetailClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChecklistDetailPage({ params }: Props) {
  const { id } = await params;
  const checklistId = parseInt(id);

  const user  = await getUser();
  const admin = user ? isAdmin(user.email) : false;
  const canEdit = Boolean(user);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <Link
        href="/checklist"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={14} /> Volver a la lista
      </Link>
      <ChecklistDetailClient
        checklistId={checklistId}
        isAdmin={admin}
        canEdit={canEdit}
      />
    </div>
  );
}
