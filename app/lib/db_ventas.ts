import sql from 'mssql';

const configBSC: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || 'BSC',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

const configIntranet: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: 'Intranet',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

export interface VentaRow {
  CpnyId: string;
  Marca: string;
  SubMarca: string;
  Version: string;
  Anio: number;
  Color: string;
  Periodo_Menos_3: number;
  Periodo_Menos_2: number;
  Periodo_Menos_1: number;
  Periodo_Actual: number;
  QtyAF: number;
  QtyAP: number;
  Inventario: number;
}

function normalizeRow(row: Record<string, unknown>): VentaRow {
  return {
    CpnyId:          String(row['CpnyId']          ?? '').trim(),
    Marca:           String(row['Marca']           ?? '').trim(),
    SubMarca:        String(row['SubMarca']        ?? '').trim(),
    Version:         String(row['Version']         ?? '').trim(),
    Anio:            Number(row['Anio']            ?? 0),
    Color:           String(row['Color']           ?? '').trim(),
    Periodo_Menos_3: Number(row['Periodo_Menos_3'] ?? 0),
    Periodo_Menos_2: Number(row['Periodo_Menos_2'] ?? 0),
    Periodo_Menos_1: Number(row['Periodo_Menos_1'] ?? 0),
    Periodo_Actual:  Number(row['Periodo_Actual']  ?? 0),
    QtyAF:           Number(row['QtyAF']           ?? 0),
    QtyAP:           Number(row['QtyAP']           ?? 0),
    Inventario:      Number(row['Inventario']      ?? 0),
  };
}

export async function getVentasYakimura(): Promise<VentaRow[]> {
  const poolIntranet = new sql.ConnectionPool(configIntranet);
  const poolBSC = new sql.ConnectionPool(configBSC);
  try {
    await poolIntranet.connect();
    await poolBSC.connect();

    // Detectar nombres reales de columnas en la vista de ventas
    const colResult = await poolIntranet.request().query(
      'SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos'
    );
    const cols: string[] = colResult.recordset.length > 0
      ? Object.keys(colResult.recordset[0])
      : [];
    const find = (candidates: string[]) =>
      candidates.find(c => cols.includes(c)) ??
      candidates.find(c => cols.map(x => x.toLowerCase()).includes(c.toLowerCase())) ??
      candidates[0];

    const anioCol     = find(['Áño', 'Año', 'Anio', 'ModelYr', 'ANO']);
    const subMarcaCol = find(['SubMarca', 'SubBrandDescr']);
    const versionCol  = find(['Version', 'VersionDescr', 'Versión']);
    const colorCol    = find(['Color']);
    const marcaCol    = find(['Marca', 'BrandDescr']);
    const cpnyCol     = find(['CpnyId', 'CpnyID']);

    // Ventas desde Intranet
    const ventasResult = await poolIntranet.request().query(`
      SELECT
        LTRIM(RTRIM([${cpnyCol}]))     AS CpnyId,
        LTRIM(RTRIM([${marcaCol}]))    AS Marca,
        LTRIM(RTRIM([${subMarcaCol}])) AS SubMarca,
        LTRIM(RTRIM([${versionCol}]))  AS Version,
        [${anioCol}]                   AS Anio,
        LTRIM(RTRIM([${colorCol}]))    AS Color,
        ISNULL(Periodo_Menos_3, 0)     AS Periodo_Menos_3,
        ISNULL(Periodo_Menos_2, 0)     AS Periodo_Menos_2,
        ISNULL(Periodo_Menos_1, 0)     AS Periodo_Menos_1,
        ISNULL(Periodo_Actual,  0)     AS Periodo_Actual
      FROM dbo.vw_VentasUltimos4Periodos
      ORDER BY [${subMarcaCol}], [${versionCol}], [${anioCol}], [${colorCol}]
    `);

    // Inventario desde BSC: agrupar solo por CpnyId + SubBrandDescr (sin Anio)
    // SubBrandDescr en Inventory = SubMarca en vw_VentasUltimos4Periodos
    // Se omite Anio del JOIN porque el año modelo en inventario puede diferir del año en ventas
    const invResult = await poolBSC.request().query(`
      SELECT
        LTRIM(RTRIM(CpnyID))        AS CpnyId,
        LTRIM(RTRIM(SubBrandDescr)) AS SubMarca,
        SUM(ISNULL(QtyAF, 0))       AS QtyAF,
        SUM(ISNULL(QtyAP, 0))       AS QtyAP
      FROM dbo.Inventory
      WHERE QtyAF > 0 OR QtyAP > 0 OR QtyDP > 0 OR QtyAD > 0
      GROUP BY
        LTRIM(RTRIM(CpnyID)),
        LTRIM(RTRIM(SubBrandDescr))
    `);

    // Construir mapa de inventario por CpnyId|SubMarca (sin Anio)
    type InvRow = { CpnyId: string; SubMarca: string; QtyAF: number; QtyAP: number };
    const invMap = new Map<string, InvRow>();
    for (const inv of invResult.recordset as InvRow[]) {
      const key = `${inv.CpnyId}|${inv.SubMarca}`.toLowerCase();
      invMap.set(key, inv);
    }

    // Solo asignar inventario en la primera fila del grupo CpnyId|SubMarca
    // Las filas subsecuentes reciben 0 para evitar duplicacion en sumatorias
    const keyUsed = new Set<string>();
    const ventasRows = ventasResult.recordset as Record<string, unknown>[];
    const merged = ventasRows.map(v => {
      const key = `${String(v['CpnyId']??'').trim()}|${String(v['SubMarca']??'').trim()}`.toLowerCase();
      const inv = invMap.get(key);
      if (inv && !keyUsed.has(key)) {
        keyUsed.add(key);
        return {
          ...v,
          QtyAF:      inv.QtyAF,
          QtyAP:      inv.QtyAP,
          Inventario: inv.QtyAF + inv.QtyAP,
        };
      }
      return {
        ...v,
        QtyAF:      0,
        QtyAP:      0,
        Inventario: 0,
      };
    });

    return merged.map(normalizeRow);
  } finally {
    await poolIntranet.close().catch(() => {});
    await poolBSC.close().catch(() => {});
  }
}
