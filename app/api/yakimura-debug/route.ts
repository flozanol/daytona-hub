import { NextResponse } from 'next/server';
import { getInventory } from '../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de diagnóstico TEMPORAL — solo lectura, no lo usa ninguna
 * pantalla. Sirve para confirmar, agencia por agencia, la suma real de
 * QtyAF/QtyAP/QtyAD/QtyDP tal como las entrega getInventory() (la MISMA
 * función que usa la Clínica del Inventario), sin pasar por el cruce de
 * ventas de Yakimura. Si aquí ya sale un número inflado para una agencia,
 * el problema está en el inventario crudo / la consulta a SQL. Si aquí
 * sale correcto pero Yakimura muestra más, el problema está en el cruce
 * de db_ventas.ts.
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

export async function GET() {
  try {
    const rows = (await getInventory()) as Record<string, unknown>[];

    const porAgencia: { [cpny: string]: AgenciaDebug } = {};
    const vinVistos: { [vin: string]: number } = {};

    for (const r of rows) {
      if (String(r['BrandDescr'] ?? '').trim().toUpperCase() === 'OTRO') continue;

      const cpny = String(r['CpnyID'] ?? '').trim().toUpperCase();
      if (!porAgencia[cpny]) {
        porAgencia[cpny] = { filas: 0, qtyAF: 0, qtyAP: 0, qtyAD: 0, qtyDP: 0 };
      }
      porAgencia[cpny].filas += 1;
      porAgencia[cpny].qtyAF += Number(r['QtyAF']) || 0;
      porAgencia[cpny].qtyAP += Number(r['QtyAP']) || 0;
      porAgencia[cpny].qtyAD += Number(r['QtyAD']) || 0;
      porAgencia[cpny].qtyDP += Number(r['QtyDP']) || 0;

      const vin = String(r['VIN'] ?? '').trim().toUpperCase();
      if (vin && vin !== 'N/A') {
        vinVistos[vin] = (vinVistos[vin] || 0) + 1;
      }
    }

    const vinsRepetidos = [];
    for (const vin in vinVistos) {
      if (vinVistos[vin] > 1) {
        vinsRepetidos.push({ vin: vin, veces: vinVistos[vin] });
      }
    }

    return NextResponse.json({
      totalFilasInventario: rows.length,
      porAgencia: porAgencia,
      vinsRepetidosEnInventario: vinsRepetidos.length,
      ejemplosVinsRepetidos: vinsRepetidos.slice(0, 10),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error de conexión SQL', details: msg }, { status: 500 });
  }
}
