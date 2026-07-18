import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyChecklists } from '@/app/lib/db_checklist';
import { getWeekStartDateMX } from '@/lib/week';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  const cronHeader = request.headers.get('x-cron-secret');
  return cronHeader === secret;
}

// POST /api/checklist/cron/weekly
// Header: Authorization: Bearer <CRON_SECRET>  ó  x-cron-secret: <CRON_SECRET>
export async function POST(request: NextRequest) {
  if (!authorizeCron(request)) {
    console.warn('[cron:weekly] request rechazado: no autorizado');
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let weekStartDate = getWeekStartDateMX();
  let crtdUser = 0;

  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.weekStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)) {
      weekStartDate = body.weekStartDate;
    }
    if (typeof body.crtdUser === 'number' && Number.isFinite(body.crtdUser)) {
      crtdUser = body.crtdUser;
    }
  } catch {
    // body opcional
  }

  console.log('[cron:weekly] endpoint invocado', { weekStartDate, crtdUser });

  try {
    const result = await generateWeeklyChecklists(crtdUser, weekStartDate);
    console.log('[cron:weekly] endpoint OK', {
      weekStartDate: result.weekStartDate,
      companies: result.companies.length,
      totalCreated: result.totalCreated,
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron:weekly] endpoint ERROR', error);
    return NextResponse.json({ error: 'Error al generar corrida semanal', details: msg }, { status: 500 });
  }
}
