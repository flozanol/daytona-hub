import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { canViewAll } from '@/lib/permissions';
import {
  getCpnyIdByName,
  getChecklistsByPage,
  addChecklist,
  getVehicleById,
  getChecklistTemplate,
  addChecklistItem,
} from '@/app/lib/db_checklist';
// getCpnyIdByName sigue usándose en GET para no-admins

export const dynamic = 'force-dynamic';

// GET /api/checklist?page=1&pageSize=20
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1'));
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'));

  let cpnyId = 0; // 0 = todos (admin)
  if (!canViewAll(user.email)) {
    if (!user.company) {
      return NextResponse.json({ error: 'Empresa no definida en el token' }, { status: 400 });
    }
    const found = await getCpnyIdByName(user.company);
    if (found === null) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 400 });
    }
    cpnyId = found;
  }

  try {
    const result = await getChecklistsByPage(cpnyId, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al obtener checklists', details: msg }, { status: 500 });
  }
}

// POST /api/checklist  { invtId: number }
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let body: { invtId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const invtId = typeof body.invtId === 'number' ? body.invtId : parseInt(String(body.invtId));
  if (!Number.isFinite(invtId) || invtId <= 0) {
    return NextResponse.json({ error: 'invtId inválido' }, { status: 400 });
  }

  // Siempre obtenemos el vehículo — su CpnyID es la fuente de verdad
  const vehicle = await getVehicleById(invtId);
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  }

  // No-admins: validar que el vehículo pertenece a su empresa por CpnyName
  if (!canViewAll(user.email)) {
    if (!user.company || vehicle.CpnyName.trim().toLowerCase() !== user.company.trim().toLowerCase()) {
      return NextResponse.json({ error: 'No tienes acceso a ese vehículo' }, { status: 403 });
    }
  }

  const cpnyId = vehicle.CpnyID;

  try {
    const checklistId = await addChecklist(invtId, cpnyId, parseInt(user.userID));

    // Auto-poblar con los ítems del template (en paralelo, no bloquea si falla)
    const templateItems = await getChecklistTemplate().catch(() => []);
    if (templateItems.length > 0) {
      await Promise.all(
        templateItems.map((t, i) =>
          addChecklistItem(checklistId, t.Categoria, t.Descripcion, null, null, t.OrderIndex ?? i),
        ),
      );
    }

    return NextResponse.json({ checklistId }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Error al crear checklist', details: msg }, { status: 500 });
  }
}
