import { NextResponse } from 'next/server';
import { getInventory } from '../../lib/db';
import { getVentasYakimura } from '../../lib/db_ventas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de diagnóstico TEMPORAL — solo lectura, no lo usa ninguna
 * pantalla. Compara, agencia por agencia:
 *  1) El inventario crudo tal como lo entrega getInventory() (la MISMA
 *     función que usa la Clínica del Inventario).
 *  2) La salida real de getVentasYakimura() (lo que efectivamente
 *     devuelve /api/yakimura y consume la tabla de Yakimura).
 *
 * Si (2) es mayor que (1), el bug sigue estando en el cruce de
 * db_ventas.ts. Si (2) coincide con (1), el problema ya estaba resuelto
 * y lo que se ve en pantalla es otra cosa (caché, filtro, etc.).
 *
 * Se puede borrar este archivo una vez resuelto el problema de conteo.
 */
interface AgenciaDebug {
  filas: number;
  qtyAF: number;
  qtyAP: number;
  qtyAD: number;
  qtyDP: number;
}

interface AgenciaYakimura {
  filas: number;
  qtyAF: number;
  qtyAP: number;
}

export async function GET() {
  try {
    // 1) Inventario crudo (misma fuente que la Clínica)
    const invRows = (await getInventory()) as Record<string, unknown>[];
    const porAgenciaInventario: { [cpny: string]: AgenciaDebug } = {};

    for (const r of invRows) {
      if (String(r['BrandDescr'] ?? '').trim().toUpperCase() === 'OTRO') continue;
      const cpny = String(r['CpnyID'] ?? '').trim().toUpperCase();
      if (!porAgenciaInventario[cpny]) {
        porAgenciaInventario[cpny] = { filas: 0, qtyAF: 0, qtyAP: 0, qtyAD: 0, qtyDP: 0 };
      }
      porAgenciaInventario[cpny].filas += 1;
      porAgenciaInventario[cpny].qtyAF += Number(r['QtyAF']) || 0;
      porAgenciaInventario[cpny].qtyAP += Number(r['QtyAP']) || 0;
      porAgenciaInventario[cpny].qtyAD += Number(r['QtyAD']) || 0;
      porAgenciaInventario[cpny].qtyDP += Number(r['QtyDP']) || 0;
    }

    // 2) Salida real de Yakimura (lo que consume la tabla)
    const yakiRows = await getVentasYakimura();
    const porAgenciaYakimura: { [cpny: string]: AgenciaYakimura } = {};

    for (const r of yakiRows) {
      const cpny = String(r.CpnyId || '').trim().toUpperCase();
      if (!cpny) continue;
      if (!porAgenciaYakimura[cpny]) {
        porAgenciaYakimura[cpny] = { filas: 0, qtyAF: 0, qtyAP: 0 };
      }
      porAgenciaYakimura[cpny].filas += 1;
      porAgenciaYakimura[cpny].qtyAF += Number(r.QtyAF) || 0;
      porAgenciaYakimura[cpny].qtyAP += Number(r.QtyAP) || 0;
    }

    return NextResponse.json({
      inventarioCrudo: porAgenciaInventario,
      salidaYakimura: porAgenciaYakimura,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error de conexión SQL', details: msg }, { status: 500 });
  }
}
