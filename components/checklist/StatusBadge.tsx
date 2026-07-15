import type { ChecklistStatus } from '@/types/checklist';

interface StatusBadgeProps {
  status: ChecklistStatus;
}

const STATUS_MAP: Record<ChecklistStatus, { label: string; className: string }> = {
  1: { label: 'En proceso',  className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
  2: { label: 'Completado',  className: 'bg-green-100  text-green-800  border border-green-200'  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = STATUS_MAP[status] ?? STATUS_MAP[1];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
