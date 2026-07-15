import sql from 'mssql';
import { withPool as _withPool } from './db-connection';
import type {
  ChecklistSummary,
  ChecklistItem,
  TemplateItem,
  VehicleRow,
  PaginatedResult,
} from '@/types/checklist';

function withPool<T>(fn: (pool: sql.ConnectionPool) => Promise<T>): Promise<T> {
  return _withPool('Intranet', fn);
}

// ─────────────────────────────────────────────
// Company lookup
// ─────────────────────────────────────────────

/** Resuelve el CpnyID (INT) a partir del nombre de empresa del JWT */
export async function getCpnyIdByName(companyName: string): Promise<number | null> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('name', sql.NVarChar(120), companyName)
      .query('SELECT TOP 1 IDCpny FROM sqlintranet.Intranet_Company WHERE Descr = @name');
    return (result.recordset[0]?.IDCpny as number) ?? null;
  });
}

// ─────────────────────────────────────────────
// Inventario de seminuevos
// ─────────────────────────────────────────────

export async function getVehicles(
  cpnyId: number | null,
  search: string | null,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<VehicleRow>> {
  return withPool(async (pool) => {
    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    if (cpnyId !== null) conditions.push('CpnyID = @CpnyID');

    // Búsqueda multi-término: cada palabra debe aparecer en algún campo
    const terms = search ? search.trim().split(/\s+/).filter(Boolean) : [];
    terms.forEach((_, i) => {
      conditions.push(
        `(VIN LIKE @T${i} OR SLInvtID LIKE @T${i} OR Marca LIKE @T${i} OR SubMarca LIKE @T${i} OR Version LIKE @T${i} OR CAST(ModeloYr AS VARCHAR) LIKE @T${i})`,
      );
    });

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const addInputs = (req: sql.Request) => {
      if (cpnyId !== null) req.input('CpnyID', sql.Int, cpnyId);
      terms.forEach((term, i) => req.input(`T${i}`, sql.NVarChar(100), `%${term}%`));
      return req;
    };

    const countResult = await addInputs(pool.request()).query(
      `SELECT COUNT(*) AS total FROM sqlintranet.Intranet_InvtSmnvos ${where}`,
    );
    const total = (countResult.recordset[0]?.total as number) ?? 0;

    const dataResult = await addInputs(pool.request())
      .input('Offset',   sql.Int, offset)
      .input('PageSize', sql.Int, pageSize)
      .query(`
        SELECT InvtID, SLInvtID, VIN, CpnyID, CpnyName,
               Marca, SubMarca, Version, ModeloYr,
               Kilometraje, CExterior, Precio, Age
        FROM   sqlintranet.Intranet_InvtSmnvos
        ${where}
        ORDER BY InvtID DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
      `);

    return { data: dataResult.recordset as VehicleRow[], total, page, pageSize };
  });
}

/** Devuelve un vehículo por InvtID (para validar acceso al crear checklist) */
export async function getVehicleById(invtId: number): Promise<VehicleRow | null> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('InvtID', sql.Int, invtId)
      .query(`
        SELECT TOP 1 InvtID, SLInvtID, VIN, CpnyID, CpnyName,
               Marca, SubMarca, Version, ModeloYr,
               Kilometraje, CExterior, Precio, Age
        FROM   sqlintranet.Intranet_InvtSmnvos
        WHERE  InvtID = @InvtID
      `);
    return (result.recordset[0] as VehicleRow) ?? null;
  });
}

// ─────────────────────────────────────────────
// Checklist — encabezado
// ─────────────────────────────────────────────

export async function addChecklist(
  invtId: number,
  cpnyId: number,
  crtdUser: number,
): Promise<number> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('InvtID',    sql.Int, invtId)
      .input('CpnyID',    sql.Int, cpnyId)
      .input('Crtd_User', sql.Int, crtdUser)
      .output('ChecklistID', sql.Int)
      .execute('Smnvo_AddChecklist');
    return result.output['ChecklistID'] as number;
  });
}

export async function updateChecklistStatus(
  checklistId: number,
  status: 1 | 2,
  lupdUser: number,
): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('ChecklistID', sql.Int,      checklistId)
      .input('Status',      sql.SmallInt, status)
      .input('Lupd_User',   sql.Int,      lupdUser)
      .execute('Smnvo_UpdateChecklistStatus');
  });
}

export async function deleteChecklist(checklistId: number): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('ChecklistID', sql.Int, checklistId)
      .execute('Smnvo_DeleteChecklist');
  });
}

export async function getSingleChecklist(checklistId: number): Promise<ChecklistSummary | null> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('ChecklistID', sql.Int, checklistId)
      .execute('Smnvo_GetSingleChecklist');
    return (result.recordset[0] as ChecklistSummary) ?? null;
  });
}

export async function getChecklistsByPage(
  cpnyId: number,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<ChecklistSummary>> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('CpnyID',      sql.Int, cpnyId)
      .input('CurrentPage', sql.Int, page)
      .input('PageSize',    sql.Int, pageSize)
      .output('TotalRecords', sql.Int)
      .execute('Smnvo_GetChecklistsByPage');

    const total = (result.output['TotalRecords'] as number) ?? 0;
    return {
      data:     result.recordset as ChecklistSummary[],
      total,
      page,
      pageSize,
    };
  });
}

// ─────────────────────────────────────────────
// Checklist — ítems
// ─────────────────────────────────────────────

export async function getItemsByChecklist(checklistId: number): Promise<ChecklistItem[]> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('ChecklistID', sql.Int, checklistId)
      .execute('Smnvo_GetItemsByChecklist');
    return result.recordset as ChecklistItem[];
  });
}

export async function addChecklistItem(
  checklistId: number,
  categoria:   string,
  descripcion: string,
  resultado:   boolean | null,
  notas:       string | null,
  orderIndex:  number,
): Promise<number> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('ChecklistID',  sql.Int,          checklistId)
      .input('Categoria',    sql.NVarChar(80),  categoria)
      .input('Descripcion',  sql.NVarChar(200), descripcion)
      .input('Resultado',    sql.Bit,           resultado)
      .input('Notas',        sql.NVarChar(255), notas)
      .input('OrderIndex',   sql.Int,           orderIndex)
      .output('ItemID',      sql.Int)
      .execute('Smnvo_AddChecklistItem');
    return result.output['ItemID'] as number;
  });
}

export async function updateChecklistItem(
  itemId:      number,
  categoria:   string,
  descripcion: string,
  resultado:   boolean | null,
  notas:       string | null,
): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('ItemID',      sql.Int,          itemId)
      .input('Categoria',   sql.NVarChar(80),  categoria)
      .input('Descripcion', sql.NVarChar(200), descripcion)
      .input('Resultado',   sql.Bit,           resultado)
      .input('Notas',       sql.NVarChar(255), notas)
      .execute('Smnvo_UpdateChecklistItem');
  });
}

export async function deleteChecklistItem(itemId: number): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('ItemID', sql.Int, itemId)
      .execute('Smnvo_DeleteChecklistItem');
  });
}

// ─────────────────────────────────────────────
// Template de ítems
// ─────────────────────────────────────────────

export async function getChecklistTemplate(): Promise<TemplateItem[]> {
  return withPool(async (pool) => {
    const result = await pool.request().execute('Smnvo_GetChecklistTemplate');
    return result.recordset as TemplateItem[];
  });
}

export async function addTemplateItem(
  categoria:   string,
  descripcion: string,
  orderIndex:  number,
): Promise<number> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('Categoria',      sql.NVarChar(80),  categoria)
      .input('Descripcion',    sql.NVarChar(200), descripcion)
      .input('OrderIndex',     sql.Int,           orderIndex)
      .output('TemplateItemID', sql.Int)
      .execute('Smnvo_AddTemplateItem');
    return result.output['TemplateItemID'] as number;
  });
}

export async function updateTemplateItem(
  templateItemId: number,
  categoria:      string,
  descripcion:    string,
  orderIndex:     number,
): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('TemplateItemID', sql.Int,           templateItemId)
      .input('Categoria',      sql.NVarChar(80),  categoria)
      .input('Descripcion',    sql.NVarChar(200), descripcion)
      .input('OrderIndex',     sql.Int,           orderIndex)
      .execute('Smnvo_UpdateTemplateItem');
  });
}

export async function deleteTemplateItem(templateItemId: number): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('TemplateItemID', sql.Int, templateItemId)
      .execute('Smnvo_DeleteTemplateItem');
  });
}
