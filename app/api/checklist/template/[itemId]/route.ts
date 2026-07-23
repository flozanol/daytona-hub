import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { updateTemplateItem, deleteTemplateItem } from '@/app/lib/db_checklist';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ itemId: string }> };

// PATCH /api/checklist/template/[itemId]
export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { itemId } = await params;
  const id = parseInt(itemId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  let body: { categoria?: unknown; descripcion?: unknown; orderIndex?: unknown; tipoItem?: unknown; opciones?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const categoria   = typeof body.categoria   === 'string' ? body.categoria.trim()   : '';
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  if (!categoria || !descripcion) {
    return NextResponse.json({ error: 'categoria y descripcion son requeridos' }, { status: 400 });
  }
  const orderIndex = typeof body.orderIndex === 'number' ? body.orderIndex : 0;
  const tipoItem = body.tipoItem === 'opciones' ? 'opciones' as const : 'boolean' as const;
  const opciones = tipoItem === 'opciones' && Array.isArray(body.opciones)
    ? (body.opciones as unknown[]).filter((o): o is string => typeof o === 'string' && o.trim() !== '')
    : null;

  try {
    await updateTemplateItem(id, categoria, descripcion, orderIndex, tipoItem, opciones?.length ? opciones : null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[PATCH /api/checklist/template]', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al actualizar ítem', details: msg }, { status: 500 });
  }
}

// DELETE /api/checklist/template/[itemId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { itemId } = await params;
  const id = parseInt(itemId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  try {
    await deleteTemplateItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/checklist/template]', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al eliminar ítem', details: msg }, { status: 500 });
  }
}
