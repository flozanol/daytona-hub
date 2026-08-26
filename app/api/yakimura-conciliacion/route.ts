import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';

export async function GET() {
  try {
    const rows = await getInventory();
    const inventory = Array.isArray(rows) ? rows : [];
    const sample = inventory.slice(0, 3);
    const keys = sample.length ? Object.keys(sample[0]) : [];

    return NextResponse.json({
      diagnostic: true,
      rowCount: inventory.length,
      keys,
      sample
    });
  } catch (error) {
    console.error('Error diagnosticando inventario Yakimura:', error);
    return NextResponse.json({ error: 'Error al obtener inventario', detail: String(error) }, { status: 500 });
  }
}
