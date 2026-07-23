import sql from 'mssql';
import { withPool as _withPool } from './db-connection';
import { getWeekStartDateMX } from '@/lib/week';
import type {
  ChecklistSummary,
  ChecklistItem,
  TemplateItem,
  VehicleRow,
  PaginatedResult,
  WeekRunProgress,
  WeeklyGenerateResult,
  TipoItem,
} from '@/types/checklist';

type RawTemplateItem  = Omit<TemplateItem,  'Opciones' | 'TipoItem'> & { Opciones: string | null; TipoItem: string };
type RawChecklistItem = Omit<ChecklistItem, 'Opciones' | 'TipoItem'> & { Opciones: string | null; TipoItem: string };

function parseOpciones(raw: string | null): string[] | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as string[]; } catch { return null; }
}

function withPool<T>(
  fn: (pool: sql.ConnectionPool) => Promise<T>,
  opts?: { requestTimeoutMs?: number; silent?: boolean },
): Promise<T> {
  return _withPool('Intranet', fn, opts);
}

function cronLog(message: string, extra?: Record<string, unknown>) {
  if (extra) {
    console.log(`[cron:weekly] ${message}`, extra);
  } else {
    console.log(`[cron:weekly] ${message}`);
  }
}

function isDuplicateWeekError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('DUPLICATE_WEEK_CHECKLIST');
}

export class DuplicateWeekChecklistError extends Error {
  constructor() {
    super('Ya existe un checklist para este vehículo en la semana actual');
    this.name = 'DuplicateWeekChecklistError';
  }
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
  opts?: { disponibleOnly?: boolean; excludeWeekStartDate?: string | null },
): Promise<PaginatedResult<VehicleRow>> {
  return withPool(async (pool) => {
    const offset = (page - 1) * pageSize;
    const conditions: string[] = [];
    if (cpnyId !== null) conditions.push('i.CpnyID = @CpnyID');
    if (opts?.disponibleOnly) conditions.push("i.Disponible = '1'");

    const terms = search ? search.trim().split(/\s+/).filter(Boolean) : [];
    terms.forEach((_, idx) => {
      conditions.push(
        `(i.VIN LIKE @T${idx} OR i.SLInvtID LIKE @T${idx} OR i.Marca LIKE @T${idx} OR i.SubMarca LIKE @T${idx} OR i.Version LIKE @T${idx} OR CAST(i.ModeloYr AS VARCHAR) LIKE @T${idx})`,
      );
    });

    if (opts?.excludeWeekStartDate) {
      conditions.push(`NOT EXISTS (
        SELECT 1
        FROM dbo.Smnvo_Checklist c
        INNER JOIN dbo.Smnvo_ChecklistWeekRun w ON w.WeekRunID = c.WeekRunID
        WHERE c.InvtID = i.InvtID AND w.WeekStartDate = @ExcludeWeekStart
      )`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const addInputs = (req: sql.Request) => {
      if (cpnyId !== null) req.input('CpnyID', sql.Int, cpnyId);
      if (opts?.excludeWeekStartDate) {
        req.input('ExcludeWeekStart', sql.Date, opts.excludeWeekStartDate);
      }
      terms.forEach((term, idx) => req.input(`T${idx}`, sql.NVarChar(100), `%${term}%`));
      return req;
    };

    const countResult = await addInputs(pool.request()).query(
      `SELECT COUNT(*) AS total FROM sqlintranet.Intranet_InvtSmnvos i ${where}`,
    );
    const total = (countResult.recordset[0]?.total as number) ?? 0;

    const dataResult = await addInputs(pool.request())
      .input('Offset',   sql.Int, offset)
      .input('PageSize', sql.Int, pageSize)
      .query(`
        SELECT i.InvtID, i.SLInvtID, i.VIN, i.CpnyID, i.CpnyName,
               i.Marca, i.SubMarca, i.Version, i.ModeloYr,
               i.Kilometraje, i.CExterior, i.Precio, i.Age, i.Disponible
        FROM   sqlintranet.Intranet_InvtSmnvos i
        ${where}
        ORDER BY i.InvtID DESC
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
               Kilometraje, CExterior, Precio, Age, Disponible
        FROM   sqlintranet.Intranet_InvtSmnvos
        WHERE  InvtID = @InvtID
      `);
    return (result.recordset[0] as VehicleRow) ?? null;
  });
}

/** Autos disponibles (Disponible='1'), opcionalmente por company */
export async function getAvailableVehicles(cpnyId?: number | null): Promise<VehicleRow[]> {
  return withPool(async (pool) => {
    const req = pool.request();
    let where = "WHERE Disponible = '1'";
    if (cpnyId != null) {
      req.input('CpnyID', sql.Int, cpnyId);
      where += ' AND CpnyID = @CpnyID';
    }
    const result = await req.query(`
      SELECT InvtID, SLInvtID, VIN, CpnyID, CpnyName,
             Marca, SubMarca, Version, ModeloYr,
             Kilometraje, CExterior, Precio, Age, Disponible
      FROM   sqlintranet.Intranet_InvtSmnvos
      ${where}
      ORDER BY CpnyID, InvtID
    `);
    return result.recordset as VehicleRow[];
  });
}

// ─────────────────────────────────────────────
// Week runs
// ─────────────────────────────────────────────

export async function ensureWeekRun(
  cpnyId: number,
  weekStartDate: string,
  crtdUser: number,
): Promise<number> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('CpnyID',        sql.Int,  cpnyId)
      .input('WeekStartDate', sql.Date, weekStartDate)
      .input('Crtd_User',     sql.Int,  crtdUser)
      .output('WeekRunID',    sql.Int)
      .execute('Smnvo_EnsureWeekRun');
    return result.output['WeekRunID'] as number;
  });
}

export async function hasChecklistInWeekRun(invtId: number, weekRunId: number): Promise<boolean> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('InvtID',    sql.Int, invtId)
      .input('WeekRunID', sql.Int, weekRunId)
      .output('Exists',   sql.Bit)
      .execute('Smnvo_HasChecklistInWeekRun');
    return Boolean(result.output['Exists']);
  });
}

export async function getWeekRunsWithProgress(
  cpnyId: number,
  weekStartDate: string | null,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<WeekRunProgress>> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('CpnyID',        sql.Int,  cpnyId)
      .input('WeekStartDate', sql.Date, weekStartDate)
      .input('CurrentPage',   sql.Int,  page)
      .input('PageSize',      sql.Int,  pageSize)
      .output('TotalRecords', sql.Int)
      .execute('Smnvo_GetWeekRunsWithProgress');

    const total = (result.output['TotalRecords'] as number) ?? 0;
    const data = (result.recordset as WeekRunProgress[]).map((row) => ({
      ...row,
      WeekStartDate: typeof row.WeekStartDate === 'string'
        ? row.WeekStartDate.slice(0, 10)
        : new Date(row.WeekStartDate as unknown as string).toISOString().slice(0, 10),
    }));

    return { data, total, page, pageSize };
  });
}

/**
 * Genera la corrida semanal.
 * Usa UNA sola conexión a SQL (antes abría/cerraba pool por cada auto/ítem).
 * Por company: ensure WeekRun → set de ya existentes → INSERT masivo de checklists + ítems → recount 1 vez.
 */
export async function generateWeeklyChecklists(
  crtdUser: number,
  weekStartDate: string = getWeekStartDateMX(),
): Promise<WeeklyGenerateResult> {
  const startedAt = Date.now();
  cronLog('inicio', { weekStartDate, crtdUser });

  return withPool(async (pool) => {
    // 1) Inventario disponible
    cronLog('cargando autos Disponible=1…');
    const vehiclesResult = await pool.request().query(`
      SELECT InvtID, SLInvtID, VIN, CpnyID, CpnyName,
             Marca, SubMarca, Version, ModeloYr,
             Kilometraje, CExterior, Precio, Age, Disponible
      FROM   sqlintranet.Intranet_InvtSmnvos
      WHERE  Disponible = '1'
      ORDER BY CpnyID, InvtID
    `);
    const vehicles = vehiclesResult.recordset as VehicleRow[];
    cronLog('autos cargados', { total: vehicles.length });

    const byCompany = new Map<number, VehicleRow[]>();
    for (const v of vehicles) {
      const list = byCompany.get(v.CpnyID) ?? [];
      list.push(v);
      byCompany.set(v.CpnyID, list);
    }
    cronLog('companies con stock', { count: byCompany.size });

    // 2) Template (una sola vez)
    cronLog('cargando template…');
    const templateResult = await pool.request().execute('Smnvo_GetChecklistTemplate');
    const templateItems = templateResult.recordset as TemplateItem[];
    cronLog('template listo', { items: templateItems.length });

    const companies: WeeklyGenerateResult['companies'] = [];
    let totalCreated = 0;
    let companyIndex = 0;

    for (const [cpnyId, list] of byCompany) {
      companyIndex++;
      const cpnyName = (list[0]?.CpnyName ?? String(cpnyId)).trim();
      cronLog(`company ${companyIndex}/${byCompany.size}`, {
        cpnyId,
        cpnyName,
        vehicles: list.length,
      });

      // 3) Upsert corrida
      const ensureResult = await pool.request()
        .input('CpnyID',        sql.Int,  cpnyId)
        .input('WeekStartDate', sql.Date, weekStartDate)
        .input('Crtd_User',     sql.Int,  crtdUser)
        .output('WeekRunID',    sql.Int)
        .execute('Smnvo_EnsureWeekRun');
      const weekRunId = ensureResult.output['WeekRunID'] as number;
      cronLog('  weekRun', { weekRunId });

      // 4) Ya existentes en esta corrida (1 query, no N)
      const existingResult = await pool.request()
        .input('WeekRunID', sql.Int, weekRunId)
        .query(`
          SELECT InvtID FROM dbo.Smnvo_Checklist WHERE WeekRunID = @WeekRunID
        `);
      const existing = new Set<number>(
        (existingResult.recordset as Array<{ InvtID: number }>).map((r) => r.InvtID),
      );

      const toCreate = list.filter((v) => !existing.has(v.InvtID));
      const skipped = list.length - toCreate.length;
      cronLog('  pendientes vs ya creados', {
        toCreate: toCreate.length,
        skipped,
      });

      let created = 0;

      if (toCreate.length > 0) {
        // 5) INSERT masivo de headers + OUTPUT ChecklistID/InvtID
        const valuesSql = toCreate.map((_, i) => `(@Invt${i})`).join(', ');
        const insertReq = pool.request()
          .input('CpnyID', sql.Int, cpnyId)
          .input('Crtd_User', sql.Int, crtdUser)
          .input('WeekRunID', sql.Int, weekRunId);
        toCreate.forEach((v, i) => insertReq.input(`Invt${i}`, sql.Int, v.InvtID));

        const insertResult = await insertReq.query(`
          INSERT INTO dbo.Smnvo_Checklist (InvtID, CpnyID, Status, Crtd_User, WeekRunID)
          OUTPUT INSERTED.ChecklistID, INSERTED.InvtID
          SELECT v.InvtID, @CpnyID, 1, @Crtd_User, @WeekRunID
          FROM (VALUES ${valuesSql}) AS v(InvtID)
        `);

        const createdRows = insertResult.recordset as Array<{ ChecklistID: number; InvtID: number }>;
        created = createdRows.length;
        cronLog('  checklists insertados', { created });

        // 6) Ítems del template en INSERTs por lotes (límite ~2100 params en SQL Server)
        if (templateItems.length > 0 && createdRows.length > 0) {
          type ItemRow = {
            checklistId: number;
            categoria: string;
            descripcion: string;
            orderIndex: number;
            tipoItem: string;
            opciones: string | null;
          };
          const allItems: ItemRow[] = [];
          for (const row of createdRows) {
            for (const t of templateItems) {
              allItems.push({
                checklistId: row.ChecklistID,
                categoria: t.Categoria,
                descripcion: t.Descripcion,
                orderIndex: t.OrderIndex ?? 0,
                tipoItem: t.TipoItem ?? 'boolean',
                opciones: t.Opciones ? JSON.stringify(t.Opciones) : null,
              });
            }
          }

          const BATCH = 200; // 200 * 8 params = 1600 < 2100
          cronLog('  insertando ítems template…', {
            rows: allItems.length,
            batches: Math.ceil(allItems.length / BATCH),
          });

          for (let offset = 0; offset < allItems.length; offset += BATCH) {
            const slice = allItems.slice(offset, offset + BATCH);
            const itemReq = pool.request();
            const itemValues = slice.map((item, i) => {
              itemReq.input(`C${i}`,    sql.Int,           item.checklistId);
              itemReq.input(`Cat${i}`,  sql.NVarChar(80),  item.categoria);
              itemReq.input(`Des${i}`,  sql.NVarChar(200), item.descripcion);
              itemReq.input(`Ord${i}`,  sql.Int,           item.orderIndex);
              itemReq.input(`Tipo${i}`, sql.NVarChar(20),  item.tipoItem);
              itemReq.input(`Opt${i}`,  sql.NVarChar(1000), item.opciones);
              return `(@C${i}, @Cat${i}, @Des${i}, NULL, NULL, @Ord${i}, @Tipo${i}, @Opt${i})`;
            });
            await itemReq.query(`
              INSERT INTO dbo.Smnvo_ChecklistItems
                (ChecklistID, Categoria, Descripcion, Resultado, Notas, OrderIndex, TipoItem, Opciones)
              VALUES ${itemValues.join(',\n')}
            `);
          }
          cronLog('  ítems listos');
        }

        // 7) Recount una sola vez por company (antes era 1 por cada AddChecklist)
        await pool.request()
          .input('WeekRunID', sql.Int, weekRunId)
          .execute('Smnvo_RecountWeekRun');
      }

      const totalResult = await pool.request()
        .input('WeekRunID', sql.Int, weekRunId)
        .query(`SELECT COUNT(*) AS n FROM dbo.Smnvo_Checklist WHERE WeekRunID = @WeekRunID`);
      const totalInRun = (totalResult.recordset[0]?.n as number) ?? created;

      companies.push({
        cpnyId,
        cpnyName,
        weekRunId,
        created,
        totalCreated: totalInRun,
        skipped,
      });
      totalCreated += created;
      cronLog('  company OK', { created, skipped, totalInRun });
    }

    const elapsedMs = Date.now() - startedAt;
    cronLog('fin', {
      weekStartDate,
      companies: companies.length,
      totalCreated,
      elapsedMs,
    });

    return { weekStartDate, companies, totalCreated };
  }, { requestTimeoutMs: 180_000, silent: true });
}

// ─────────────────────────────────────────────
// Checklist — encabezado
// ─────────────────────────────────────────────

export async function addChecklist(
  invtId: number,
  cpnyId: number,
  crtdUser: number,
  weekRunId: number | null = null,
): Promise<number> {
  return withPool(async (pool) => {
    try {
      const result = await pool.request()
        .input('InvtID',     sql.Int, invtId)
        .input('CpnyID',     sql.Int, cpnyId)
        .input('Crtd_User',  sql.Int, crtdUser)
        .input('WeekRunID',  sql.Int, weekRunId)
        .output('ChecklistID', sql.Int)
        .execute('Smnvo_AddChecklist');
      return result.output['ChecklistID'] as number;
    } catch (error) {
      if (isDuplicateWeekError(error)) throw new DuplicateWeekChecklistError();
      throw error;
    }
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

export async function recountWeekRun(weekRunId: number): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('WeekRunID', sql.Int, weekRunId)
      .execute('Smnvo_RecountWeekRun');
  });
}

export async function deleteChecklist(checklistId: number): Promise<void> {
  const existing = await getSingleChecklist(checklistId);
  await withPool(async (pool) => {
    await pool.request()
      .input('ChecklistID', sql.Int, checklistId)
      .execute('Smnvo_DeleteChecklist');
  });
  if (existing?.WeekRunID) {
    await recountWeekRun(existing.WeekRunID);
  }
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
  weekRunId: number | null = null,
): Promise<PaginatedResult<ChecklistSummary>> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('CpnyID',      sql.Int, cpnyId)
      .input('CurrentPage', sql.Int, page)
      .input('PageSize',    sql.Int, pageSize)
      .input('WeekRunID',   sql.Int, weekRunId)
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
    return (result.recordset as RawChecklistItem[]).map(row => ({
      ...row,
      TipoItem: (row.TipoItem ?? 'boolean') as TipoItem,
      Opciones: parseOpciones(row.Opciones),
    }));
  });
}

export async function addChecklistItem(
  checklistId:     number,
  categoria:       string,
  descripcion:     string,
  resultado:       boolean | null,
  notas:           string | null,
  orderIndex:      number,
  tipoItem:        TipoItem = 'boolean',
  opciones:        string[] | null = null,
  resultadoOpcion: string | null = null,
): Promise<number> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('ChecklistID',     sql.Int,           checklistId)
      .input('Categoria',       sql.NVarChar(80),  categoria)
      .input('Descripcion',     sql.NVarChar(200), descripcion)
      .input('Resultado',       sql.Bit,           resultado)
      .input('Notas',           sql.NVarChar(255), notas)
      .input('OrderIndex',      sql.Int,           orderIndex)
      .input('TipoItem',        sql.NVarChar(20),  tipoItem)
      .input('Opciones',        sql.NVarChar(1000), opciones ? JSON.stringify(opciones) : null)
      .input('ResultadoOpcion', sql.NVarChar(200), resultadoOpcion)
      .output('ItemID',         sql.Int)
      .execute('Smnvo_AddChecklistItem');
    return result.output['ItemID'] as number;
  });
}

export async function updateChecklistItem(
  itemId:          number,
  categoria:       string,
  descripcion:     string,
  resultado:       boolean | null,
  notas:           string | null,
  resultadoOpcion: string | null = null,
): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('ItemID',          sql.Int,           itemId)
      .input('Categoria',       sql.NVarChar(80),  categoria)
      .input('Descripcion',     sql.NVarChar(200), descripcion)
      .input('Resultado',       sql.Bit,           resultado)
      .input('Notas',           sql.NVarChar(255), notas)
      .input('ResultadoOpcion', sql.NVarChar(200), resultadoOpcion)
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
    return (result.recordset as RawTemplateItem[]).map(row => ({
      ...row,
      TipoItem: (row.TipoItem ?? 'boolean') as TipoItem,
      Opciones: parseOpciones(row.Opciones),
    }));
  });
}

export async function addTemplateItem(
  categoria:   string,
  descripcion: string,
  orderIndex:  number,
  tipoItem:    TipoItem = 'boolean',
  opciones:    string[] | null = null,
): Promise<number> {
  return withPool(async (pool) => {
    const result = await pool.request()
      .input('Categoria',      sql.NVarChar(80),   categoria)
      .input('Descripcion',    sql.NVarChar(200),  descripcion)
      .input('OrderIndex',     sql.Int,            orderIndex)
      .input('TipoItem',       sql.NVarChar(20),   tipoItem)
      .input('Opciones',       sql.NVarChar(1000), opciones ? JSON.stringify(opciones) : null)
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
  tipoItem:       TipoItem = 'boolean',
  opciones:       string[] | null = null,
): Promise<void> {
  return withPool(async (pool) => {
    await pool.request()
      .input('TemplateItemID', sql.Int,            templateItemId)
      .input('Categoria',      sql.NVarChar(80),   categoria)
      .input('Descripcion',    sql.NVarChar(200),  descripcion)
      .input('OrderIndex',     sql.Int,            orderIndex)
      .input('TipoItem',       sql.NVarChar(20),   tipoItem)
      .input('Opciones',       sql.NVarChar(1000), opciones ? JSON.stringify(opciones) : null)
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
