import { NextResponse } from 'next/server';
import { getVentasYakimura } from '../../lib/db_ventas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // El frontend (YakimuraView / useYakimuraData) espera el shape completo
    // de VentaRow (CpnyId, Marca, SubMarca, Version, Anio, Color,
    // Periodo_Menos_3/2/1, QtyAF, QtyAP, Inventario). Antes esta ruta lo
    // reducía a { modelo_submodelo, anio, color } usando campos que ni
    // siquiera existen en VentaRow (r.modelo / r.submodelo), lo que dejaba
    // la tabla completamente vacía/en cero. Se regresa la fila completa tal
    // cual la entrega getVentasYakimura().
    const rows = await getVentasYakimura();
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error de conexión SQL', details: msg },
      { status: 500 }
    );
  }
}
