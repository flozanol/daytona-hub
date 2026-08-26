import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';
import { getVentasYakimuraDetalle } from '@/app/lib/db_ventas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const number = (value: unknown) => Number(value ?? 0) || 0;

const inventoryKey = (row: any) => [
  norm(row.CpnyID),
  norm(row.BrandDescr),
  norm(row.Modelo),
  norm(row.Version),
  number(row.Anio),
  norm(row.Color),
].join('|');

const salesKey = (row: any) => [
  norm(row.CpnyId),
  norm(row.Marca),
  norm(row.SubMarca),
  norm(row.Version),
  number(row.Anio),
  norm(row.Color),
].join('|');

export async function GET() {
  try {
    const [inventoryRows, salesRows] = await Promise.all([getInventory(), getVentasYakimuraDetalle()]);
    const inventory = (Array.isArray(inventoryRows) ? inventoryRows : [])
      .filter((row: any) => /matriz|clinica|tecamachalco/i.test(String(row.Ubicacion ?? '')))
      .slice(0, 20)
      .map((row: any) => ({
        CpnyID: row.CpnyID,
        BrandDescr: row.BrandDescr,
        Modelo: row.Modelo,
        Version: row.Version,
        Anio: row.Anio,
        Color: row.Color,
        Ubicacion: row.Ubicacion,
        key: inventoryKey(row),
      }));
    const sales = (Array.isArray(salesRows) ? salesRows : [])
      .filter((row: any) => number(row.Periodo_Menos_3) + number(row.Periodo_Menos_2) + number(row.Periodo_Menos_1) + number(row.Periodo_Actual) > 0)
      .slice(0, 20)
      .map((row: any) => ({
        CpnyId: row.CpnyId,
        Marca: row.Marca,
        SubMarca: row.SubMarca,
        Version: row.Version,
        Anio: row.Anio,
        Color: row.Color,
        key: salesKey(row),
      }));

    return NextResponse.json({ inventory, sales });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: 'Error diagnosticando claves', details }, { status: 500 });
  }
}
