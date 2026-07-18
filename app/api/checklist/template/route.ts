import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { isAdmin } from '@/lib/permissions';
import { getChecklistTemplate, addTemplateItem } from '@/app/lib/db_checklist';

export const dynamic = 'force-dynamic';

// GET /api/checklist/template — público para usuarios autenticados (al crear checklist)
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  try {
    const items = await getChecklistTemplate();
    return NextResponse.json(items);
  } catch (error) {
    console.error('[GET /api/checklist/template]', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al obtener template', details: msg }, { status: 500 });
  }
}

// POST /api/checklist/template  { categoria, descripcion, orderIndex }
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!isAdmin(user.email)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  let body: { categoria?: unknown; descripcion?: unknown; orderIndex?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const categoria   = typeof body.categoria   === 'string' ? body.categoria.trim()   : '';
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  if (!categoria || !descripcion) {
    return NextResponse.json({ error: 'categoria y descripcion son requeridos' }, { status: 400 });
  }
  const orderIndex = typeof body.orderIndex === 'number' ? body.orderIndex : 0;

  try {
    const id = await addTemplateItem(categoria, descripcion, orderIndex);
    return NextResponse.json({ templateItemId: id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/checklist/template]', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al agregar ítem', details: msg }, { status: 500 });
  }
}
