import { NextResponse } from 'next/server';
import { getVentasYakimura } from '../../lib/db_ventas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await getVentasYakimura();
    const data = rows.map(r => ({
      modelo_submodelo: `${(r.modelo || '').trim()} ${(r.submodelo || '').trim()}`.trim(),
      anio: r.anio,
      color: r.color
    }));
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error de conexión SQL', details: msg },
      { status: 500 }
    );
  }
}
