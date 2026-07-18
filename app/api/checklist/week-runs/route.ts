import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canViewAll } from '@/lib/permissions';
import { getWeekRunsWithProgress } from '@/app/lib/db_checklist';
import { getWeekStartDateMX } from '@/lib/week';

export const dynamic = 'force-dynamic';

// GET /api/checklist/week-runs?page=1&pageSize=20&week=current|all|YYYY-MM-DD
// Solo admins: avance semanal de todas las sucursales
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canViewAll(user.email)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'));
  const weekParam = searchParams.get('week') ?? 'current';

  const cpnyId = 0; // admins: todas las sucursales

  let weekStartDate: string | null = getWeekStartDateMX();
  if (weekParam === 'all') {
    weekStartDate = null;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    weekStartDate = weekParam;
  }

  try {
    const result = await getWeekRunsWithProgress(cpnyId, weekStartDate, page, pageSize);
    return NextResponse.json({
      ...result,
      weekStartDate: weekStartDate ?? getWeekStartDateMX(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al obtener corridas', details: msg }, { status: 500 });
  }
}
