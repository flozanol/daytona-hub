import { NextResponse } from 'next/server';
import { getSeminuevos } from '../../lib/db_seminuevos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSeminuevos();
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error en SQL', details: msg }, { status: 500 });
  }
}
