import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canViewAll } from '@/lib/permissions';
import { getCpnyIdByName, getVehicles } from '@/app/lib/db_checklist';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const search   = searchParams.get('search') || null;
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'));

  let cpnyId: number | null = null;
  if (!canViewAll(user.email)) {
    if (!user.company) {
      return NextResponse.json({ error: 'Empresa no definida en el token' }, { status: 400 });
    }
    cpnyId = await getCpnyIdByName(user.company);
    if (cpnyId === null) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 400 });
    }
  }

  try {
    const result = await getVehicles(cpnyId, search, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/checklist/inventario]', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al consultar inventario', details: msg }, { status: 500 });
  }
}
