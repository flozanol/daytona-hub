interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Cargando...' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-gray-400">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4" />
      <p className="text-sm font-bold tracking-widest uppercase">{label}</p>
    </div>
  );
}
