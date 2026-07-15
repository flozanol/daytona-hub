import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canManageItems } from '@/lib/permissions';
import { updateChecklistItem, deleteChecklistItem } from '@/app/lib/db_checklist';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string; itemId: string }> };

// PATCH /api/checklist/[id]/items/[itemId]
// { categoria, descripcion, resultado, notas }
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canManageItems(user.email)) {
    return NextResponse.json({ error: 'Sin permiso para editar ítems' }, { status: 403 });
  }

  const { itemId } = await params;
  const itemIdNum = parseInt(itemId);
  if (!Number.isFinite(itemIdNum)) {
    return NextResponse.json({ error: 'itemId inválido' }, { status: 400 });
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
