interface ExternalDashboardProps {
  src: string;
  title: string;
  label?: string;
}

export function ExternalDashboard({ src, title, label }: ExternalDashboardProps) {
  return (
    <div className="p-6 w-full h-full flex flex-col">
      <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 min-h-[85vh]">
        {/* Loading backdrop shown while iframe loads */}
        <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366] mb-4" />
          <p className="text-[#003366] font-bold text-sm tracking-widest uppercase">
            Cargando {label ?? title}...
          </p>
        </div>
        <iframe
          src={src}
          title={title}
          className="w-full flex-1 border-none"
          allowFullScreen
        />
      </div>
    </div>
  );
}
