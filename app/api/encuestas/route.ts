import { NextResponse } from 'next/server';
import { getEncuestasResumen } from '../../lib/encuestas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getEncuestasResumen();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error al obtener encuestas', details: msg },
      { status: 500 }
    );
  }
}
