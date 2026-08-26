import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';
import { getVentasYakimura } from '@/app/lib/db_ventas';

const quantity = (row: any) => Number(row.QtyAD ?? 0) + Number(row.QtyAF ?? 0) + Number(row.QtyAP ?? 0) + Number(row.QtyDP ?? 0);
const norm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

export async function GET() {
  try {
    const [inventoryRows, salesRows] = await Promise.all([getInventory(), getVentasYakimura()]);
    const inventory = (Array.isArray(inventoryRows) ? inventoryRows : []).filter((row: any) => /matriz|clinica|tecamachalco/i.test(String(row.Ubicacion ?? '')));
    const sales = Array.isArray(salesRows) ? salesRows : [];
    const salesKeys = new Set(sales.filter((row: any) => Number(row.Periodo_Menos_3 ?? 0) + Number(row.Periodo_Menos_2 ?? 0) + Number(row.Periodo_Menos_1 ?? 0) + Number(row.Periodo_Actual ?? 0) > 0).map((row: any) => [norm(row.CpnyId), norm(row.SubMarca), Number(row.Anio), norm(row.Color)].join('|')));
    const matched = inventory.filter((row: any) => salesKeys.has([norm(row.CpnyID), norm(row.Modelo), Number(row.Anio), norm(row.Color)].join('|')));
    const unmatched = inventory.filter((row: any) => !salesKeys.has([norm(row.CpnyID), norm(row.Modelo), Number(row.Anio), norm(row.Color)].join('|')));
    const sum = (rows: any[]) => rows.reduce((total, row) => total + quantity(row), 0);
    return NextResponse.json({ ventasConInventario: matched, inventarioSinHistorico: unmatched, resumen: { totalClinica: sum(inventory), emparejado: sum(matched), sinHistorico: sum(unmatched), financiados: inventory.filter((r: any) => /financiadas/i.test(String(r.Ubicacion ?? ''))).length, propios: inventory.filter((r: any) => /propia|matriz/i.test(String(r.Ubicacion ?? ''))).length, demos: inventory.filter((r: any) => /demo/i.test(String(r.Modelo ?? ''))).length, demosPropios: inventory.filter((r: any) => /demo/i.test(String(r.Modelo ?? '')) && /propia|matriz/i.test(String(r.Ubicacion ?? ''))).length } });
  } catch (error) {
    console.error('Error en conciliacion Yakimura:', error);
    return NextResponse.json({ error: 'Error al obtener conciliacion', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
