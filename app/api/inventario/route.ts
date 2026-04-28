import { NextResponse } from 'next/server';
import { getInventory } from '../../lib/db'; // Ajusta la ruta a tu archivo db.ts

export async function GET() {
  try {
    const data = await getInventory();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Error al conectar con SQL' }, { status: 500 });
  }
}