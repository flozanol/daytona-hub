'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ADMIN_PIN = process.env.ADMIN_PIN || '1233';

export type Minuta = {
  id: string;
  accion: string;
  responsable: string;
  fecha_limite: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  area: 'Ventas' | 'Seminuevos' | 'Postventa' | 'Marketing' | 'General';
  created_at?: string;
};

// Validar PIN
export async function validateAdminPin(pin: string) {
  return pin === ADMIN_PIN;
}

// Fetch headers
const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
});

// GET Todas las minutas
export async function getMinutas(): Promise<Minuta[]> {
  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_URL')) {
      return []; // Return empty if not configured
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/minutas?select=*&order=created_at.desc`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store'
    });

    if (!res.ok) {
        console.error("Error fetching minutas:", await res.text());
        return [];
    }

    return await res.json() as Minuta[];
  } catch (error) {
    console.error("Failed to fetch minutas:", error);
    return [];
  }
}

// INSERT
export async function addMinuta(minutaData: Omit<Minuta, 'id' | 'created_at'>, pin: string) {
  if (pin !== ADMIN_PIN) throw new Error("PIN Incorrecto");

  const newMinuta = {
    id: crypto.randomUUID(),
    ...minutaData,
    created_at: new Date().toISOString()
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/minutas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(newMinuta)
  });

  if (!res.ok) {
      const err = await res.text();
      console.error("Error insertando minuta:", err);
      throw new Error(`Error Supabase: ${err}`);
  }

  revalidatePath('/');
  return await res.json();
}

// UPDATE
export async function updateMinuta(id: string, updates: Partial<Omit<Minuta, 'id' | 'created_at'>>, pin: string) {
  if (pin !== ADMIN_PIN) throw new Error("PIN Incorrecto");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/minutas?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
      throw new Error("Error actualizando minuta");
  }

  revalidatePath('/');
  return await res.json();
}

// DELETE
export async function deleteMinuta(id: string, pin: string) {
  if (pin !== ADMIN_PIN) throw new Error("PIN Incorrecto");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/minutas?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!res.ok) {
      throw new Error("Error borrando minuta");
  }

  revalidatePath('/');
  return true;
}
