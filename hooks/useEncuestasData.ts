'use client';

import { useEffect, useState } from 'react';
import type { ResumenGlobal } from '../app/lib/encuestas';

interface EncuestasState {
  data: ResumenGlobal | null;
  loading: boolean;
  error: string | null;
}

export function useEncuestasData(): EncuestasState {
  const [state, setState] = useState<EncuestasState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch('/api/encuestas', { cache: 'no-store' });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.details ?? json.error ?? `HTTP ${res.status}`);
        }
        const json: ResumenGlobal = await res.json();
        if (!cancelled) setState({ data: json, loading: false, error: null });
      } catch (err: unknown) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Error desconocido',
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
