import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canEvaluateItems, canManageItems, canViewAll } from '@/lib/permissions';
import {
  getCpnyIdByName,
  getSingleChecklist,
  updateChecklistItem,
  deleteChecklistItem,
} from '@/app/lib/db_checklist';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string; itemId: string }> };

async function assertCompanyAccess(
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
  checklistId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const checklist = await getSingleChecklist(checklistId);
  if (!checklist) return { ok: false, status: 404, error: 'Checklist no encontrado' };
  if (canViewAll(user.email)) return { ok: true };
  if (!user.company) return { ok: false, status: 400, error: 'Empresa no definida en el token' };
  const cpnyId = await getCpnyIdByName(user.company);
  if (cpnyId === null) return { ok: false, status: 400, error: 'Empresa no encontrada' };
  if (cpnyId !== checklist.CpnyID) return { ok: false, status: 403, error: 'Acceso denegado' };
  return { ok: true };
}

// PATCH /api/checklist/[id]/items/[itemId]
// { categoria, descripcion, resultado, notas }
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canEvaluateItems(user.email)) {
    return NextResponse.json({ error: 'Sin permiso para editar ítems' }, { status: 403 });
  }

  const { id, itemId } = await params;
  const checklistId = parseInt(id);
  const itemIdNum = parseInt(itemId);
  if (!Number.isFinite(checklistId) || !Number.isFinite(itemIdNum)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const access = await assertCompanyAccess(user, checklistId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: {
    categoria?: unknown;
    descripcion?: unknown;
    resultado?: unknown;
    notas?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const categoria   = typeof body.categoria   === 'string' ? body.categoria.trim()   : '';
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  if (!categoria || !descripcion) {
    return NextResponse.json({ error: 'categoria y descripcion son requeridos' }, { status: 400 });
  }

  const resultado = body.resultado === true ? true : body.resultado === false ? false : null;
  const notas     = typeof body.notas === 'string' ? body.notas : null;

  try {
    await updateChecklistItem(itemIdNum, categoria, descripcion, resultado, notas);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al actualizar ítem', details: msg }, { status: 500 });
  }
}

// DELETE /api/checklist/[id]/items/[itemId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canManageItems(user.email)) {
    return NextResponse.json({ error: 'Sin permiso para eliminar ítems' }, { status: 403 });
  }

  const { itemId } = await params;
  const itemIdNum = parseInt(itemId);
  if (!Number.isFinite(itemIdNum)) {
    return NextResponse.json({ error: 'itemId inválido' }, { status: 400 });
  }

  try {
    await deleteChecklistItem(itemIdNum);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al eliminar ítem', details: msg }, { status: 500 });
  }
}
