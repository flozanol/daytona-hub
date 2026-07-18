'use server';

import { redirect } from 'next/navigation';
import { setToken, clearToken } from '@/lib/auth';

const API_URL = process.env.EXTRANET_API_URL ?? 'https://api.grupodaytona.com';

export type LoginState = { error: string } | null;

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' };
  }

  let access_token: string;
  try {
    const res = await fetch(`${API_URL}/intranet/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      const isInvalidCreds = body.message === 'INVALID_CREDENTIALS' || res.status === 401;
      return { error: isInvalidCreds ? 'Credenciales incorrectas' : 'Error de autenticación' };
    }

    const data = await res.json() as { access_token: string };
    access_token = data.access_token;
  } catch {
    return { error: 'No se pudo conectar al servidor de autenticación' };
  }

  await setToken(access_token);
  redirect('/');
}

export async function logout(): Promise<void> {
  await clearToken();
  redirect('/login');
}
