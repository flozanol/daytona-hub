import { NextResponse } from 'next/server';
import { getInventory } from '../../lib/db';

export async function GET() {
  try {
    const result = await getInventory();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en API Yakimura:', error);
    return NextResponse.json(
      { error: 'Error al consultar datos Yakimura' },
      { status: 500 }
    );
  }
}
