import { NextResponse } from 'next/server';
import { getInventory } from '../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getInventory();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error de conexión SQL', 
      details: error.message 
    }, { status: 500 });
  }
}
