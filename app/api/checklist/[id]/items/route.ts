import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canManageItems, canViewAll } from '@/lib/permissions';
import { getCpnyIdByName, getSingleChecklist, getItemsByChecklist, addChecklistItem } from '@/app/lib/db_checklist';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

async function resolveChecklist(id: string, user: Awaited<ReturnType<typeof getUser>>) {
  const checklistId = parseInt(id);
  if (!Number.isFinite(checklistId)) return { error: 'ID inválido', status: 400 } as const;

  const checklist = await getSingleChecklist(checklistId);
  if (!checklist) return { error: 'Checklist no encontrado', status: 404 } as const;

  // Non-admins can only access their company's checklists
  if (user && !canViewAll(user.email) && user.company) {
    const cpnyId = await getCpnyIdByName(user.company);
    if (cpnyId !== checklist.CpnyID) return { error: 'Acceso denegado', status: 403 } as const;
  }

  return { checklistId, checklist };
}

// GET /api/checklist/[id]/items
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const resolved = await resolveChecklist(id, user);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  try {
    const items = await getItemsByChecklist(resolved.checklistId);
    return NextResponse.json(items);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al obtener ítems', details: msg }, { status: 500 });
  }
}

// POST /api/checklist/[id]/items
// { categoria, descripcion, resultado, notas, orderIndex }
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  if (!canManageItems(user.email)) {
    return NextResponse.json({ error: 'Sin permiso para agregar ítems' }, { status: 403 });
  }

  const { id } = await params;
  const resolved = await resolveChecklist(id, user);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: {
    categoria?: unknown;
    descripcion?: unknown;
    resultado?: unknown;
    notas?: unknown;
    orderIndex?: unknown;
    tipoItem?: unknown;
    opciones?: unknown;
    resultadoOpcion?: unknown;
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

  const resultado  = body.resultado === true ? true : body.resultado === false ? false : null;
  const notas      = typeof body.notas      === 'string' ? body.notas      : null;
  const orderIndex = typeof body.orderIndex === 'number' ? body.orderIndex : 0;
  const tipoItem   = body.tipoItem === 'opciones' ? 'opciones' as const : 'boolean' as const;
  const opciones   = tipoItem === 'opciones' && Array.isArray(body.opciones)
    ? (body.opciones as unknown[]).filter((o): o is string => typeof o === 'string' && o.trim() !== '')
    : null;
  const resultadoOpcion = typeof body.resultadoOpcion === 'string' ? body.resultadoOpcion : null;

  try {
    const itemId = await addChecklistItem(
      resolved.checklistId,
      categoria,
      descripcion,
      resultado,
      notas,
      orderIndex,
      tipoItem,
      opciones?.length ? opciones : null,
      resultadoOpcion,
    );
    return NextResponse.json({ itemId }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al agregar ítem', details: msg }, { status: 500 });
  }
}
