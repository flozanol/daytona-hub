interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
}

export function ErrorState({
  title = 'Error de conexión',
  message,
  details,
}: ErrorStateProps) {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-2xl">
      <p className="text-red-700 font-black text-lg mb-2">❌ {title}</p>
      <p className="text-red-600 font-semibold mb-3">{message}</p>
      {details && (
        <pre className="bg-red-100 text-red-800 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all">
          {details}
        </pre>
      )}
      <p className="text-xs text-red-400 mt-4">
        Verifica las variables de entorno:{' '}
        <code className="bg-red-100 px-1 rounded">DB_SERVER</code>,{' '}
        <code className="bg-red-100 px-1 rounded">DB_USER</code>,{' '}
        <code className="bg-red-100 px-1 rounded">DB_PASSWORD</code>,{' '}
        <code className="bg-red-100 px-1 rounded">DB_PORT</code>
      </p>
    </div>
  );
}
