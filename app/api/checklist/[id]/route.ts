import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canDelete, canChangeStatus, canViewAll } from '@/lib/permissions';
import { getCpnyIdByName, getSingleChecklist, updateChecklistStatus, deleteChecklist } from '@/app/lib/db_checklist';
import type { ChecklistStatus } from '@/types/checklist';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function assertCompanyAccess(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  checklistCpnyId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (canViewAll(user.email)) return { ok: true };
  if (!user.company) return { ok: false, status: 400, error: 'Empresa no definida en el token' };
  const cpnyId = await getCpnyIdByName(user.company);
  if (cpnyId === null) return { ok: false, status: 400, error: 'Empresa no encontrada' };
  if (cpnyId !== checklistCpnyId) return { ok: false, status: 403, error: 'Acceso denegado' };
  return { ok: true };
}

// GET /api/checklist/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const checklistId = parseInt(id);
  if (!Number.isFinite(checklistId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const checklist = await getSingleChecklist(checklistId);
  if (!checklist) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const access = await assertCompanyAccess(user, checklist.CpnyID);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json(checklist);
}

// PATCH /api/checklist/[id]  { status: 1 | 2 }
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canChangeStatus(user.email)) {
    return NextResponse.json({ error: 'Sin permiso para cambiar status' }, { status: 403 });
  }

  const { id } = await params;
  const checklistId = parseInt(id);
  if (!Number.isFinite(checklistId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const checklist = await getSingleChecklist(checklistId);
  if (!checklist) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const access = await assertCompanyAccess(user, checklist.CpnyID);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const status = body.status as ChecklistStatus;
  if (status !== 1 && status !== 2) {
    return NextResponse.json({ error: 'Status debe ser 1 (En Proceso) o 2 (Completado)' }, { status: 400 });
  }

  try {
    await updateChecklistStatus(checklistId, status, parseInt(user.userID));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al actualizar status', details: msg }, { status: 500 });
  }
}

// DELETE /api/checklist/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canDelete(user.email)) {
    return NextResponse.json({ error: 'Sin permiso para eliminar' }, { status: 403 });
  }

  const { id } = await params;
  const checklistId = parseInt(id);
  if (!Number.isFinite(checklistId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const existing = await getSingleChecklist(checklistId);
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  try {
    await deleteChecklist(checklistId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al eliminar checklist', details: msg }, { status: 500 });
  }
}
