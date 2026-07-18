'use client';

import { useEffect, useState } from 'react';
import type { VentaRow } from '../types';

interface YakimuraState {
  data: VentaRow[];
  loading: boolean;
  error: { msg: string; details?: string } | null;
}

export function useYakimuraData(): YakimuraState {
  const [state, setState] = useState<YakimuraState>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetch('/api/yakimura')
      .then(r => r.json())
      .then((d: unknown) => {
        if (Array.isArray(d)) {
          setState({ data: d as VentaRow[], loading: false, error: null });
        } else if (d && typeof d === 'object' && 'error' in d) {
          const err = d as { error: string; details?: string };
          setState({ data: [], loading: false, error: { msg: err.error, details: err.details } });
        } else {
          setState({
            data: [],
            loading: false,
            error: { msg: 'Respuesta inesperada del servidor', details: JSON.stringify(d) },
          });
        }
      })
      .catch((e: Error) => {
        setState({
          data: [],
          loading: false,
          error: { msg: 'No se pudo contactar la API', details: e?.message },
        });
      });
  }, []);

  return state;
}
