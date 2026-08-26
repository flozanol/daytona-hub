import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';
import { getVentasYakimura } from '@/app/lib/db_ventas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const number = (value: unknown) => Number(value ?? 0) || 0;
const quantity = (row: any) =>
  number(row.QtyAD) + number(row.QtyAF) + number(row.QtyAP) + number(row.QtyDP);

const inventoryKey = (row: any) => [
  norm(row.CpnID),
  norm(row.SubBrandDescr),
  number(row.ModelYr),
  norm(row.Color),
].join('|');

const salesKey = (row: any) => [
  norm(row.CpnyID),
  norm(row.Modelo),
  number(row.Anio ?? row.ModeloYr),
  norm(row.Color),
].join('|');

export async function GET() {
  try {
    const [inventoryRows, salesRows] = await Promise.all([
      getInventory(),
      getVentasYakimura(),
    ]);

    const allInventory = Array.isArray(inventoryRows) ? inventoryRows : [];
    const sales = Array.isArray(salesRows) ? salesRows : [];
    const inventory = allInventory.filter((row: any) =>
      /matriz|clinica|tecamachalco/i.test(String(row.SiteName ?? '')),
    );

    const activeSales = sales.filter((row: any) =>
      number(row.Periodo_Menos_3) +
        number(row.Periodo_Menos_2) +
        number(row.Periodo_Menos_1) +
        number(row.Periodo_Actual) >
      0,
    );

    const salesKeys = new Set(activeSales.map(salesKey));
    const matched = inventory.filter((row: any) => salesKeys.has(inventoryKey(row)));
    const unmatched = inventory.filter((row: any) => !salesKeys.has(inventoryKey(row)));

    const sum = (rows: any[]) => rows.reduce((total, row) => total + quantity(row), 0);

    return NextResponse.json({
      totalInventario: sum(inventory),
      emparejado: sum(matched),
      sinHistorico: sum(unmatched),
      financiados: inventory.filter((row: any) => /financiados/i.test(String(row.SiteName ?? ''))).length,
      propios: inventory.filter((row: any) => /propia|matriz/i.test(String(row.SiteName ?? ''))).length,
      longitudes: {
        inventario: inventory.length,
        ventas: sales.length,
        ventasConMovimiento: activeSales.length,
        matched: matched.length,
        unmatched: unmatched.length,
      },
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error en conciliacion Yakimura:', error);
    return NextResponse.json(
      { error: 'Error al obtener conciliacion', details },
      { status: 500 },
    );
  }
}
