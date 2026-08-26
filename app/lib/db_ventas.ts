import sql from 'mssql';
import { makeConfig } from './db-connection';

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
    CpnyId: String(row['CpnyId'] ?? '').trim(),
    Marca: String(row['Marca'] ?? '').trim(),
    SubMarca: String(row['SubMarca'] ?? '').trim(),
    Version: String(row['Version'] ?? '').trim(),
    Anio: Number(row['Anio'] ?? 0),
    Color: String(row['Color'] ?? '').trim(),
    Periodo_Menos_3: Number(row['Periodo_Menos_3'] ?? 0),
    Periodo_Menos_2: Number(row['Periodo_Menos_2'] ?? 0),
    Periodo_Menos_1: Number(row['Periodo_Menos_1'] ?? 0),
    Periodo_Actual: Number(row['Periodo_Actual'] ?? 0),
    QtyAF: Number(row['QtyAF'] ?? 0),
    QtyAP: Number(row['QtyAP'] ?? 0),
    Inventario: Number(row['Inventario'] ?? 0),
  };
}

function normalizeSubBrand(subBrandDescr: string): string {
  let s = subBrandDescr.trim();
  const prefixes = ['Acura ', 'Honda ', 'KIA ', 'MG ', 'Kia ', 'Mg '];
  for (const prefix of prefixes) {
    if (s.toLowerCase().startsWith(prefix.toLowerCase())) {
      s = s.substring(prefix.length).trim();
      break;
    }
  }
  return s.split(' ')[0].toLowerCase();
}

const clinicInventoryConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER ?? '',
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT ?? '1433'),
  options: { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30_000,
  requestTimeout: 30_000,
};

type InventoryTotals = { QtyAF: number; QtyAP: number; QtyAD: number; QtyDP: number };

export async function getVentasYakimura(): Promise<VentaRow[]> {
  const poolIntranet = new sql.ConnectionPool(makeConfig('Intranet'));
  const poolInventory = new sql.ConnectionPool(clinicInventoryConfig);

  try {
    await poolIntranet.connect();
    await poolInventory.connect();

    const colResult = await poolIntranet.request().query(
      'SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos'
    );
    const cols: string[] = colResult.recordset.length > 0
      ? Object.keys(colResult.recordset[0])
      : [];
    const find = (candidates: string[]) =>
      candidates.find(c => cols.includes(c))
      ?? candidates.find(c => cols.map(x => x.toLowerCase()).includes(c.toLowerCase()))
      ?? candidates[0];

    const anioCol = find(['Año', 'Anio', 'ModelYr', 'ANO', 'Áño']);
    const subMarcaCol = find(['SubMarca', 'SubBrandDescr']);
    const versionCol = find(['Version', 'VersionDescr', 'Versión']);
    const colorCol = find(['Color']);
    const marcaCol = find(['Marca', 'BrandDescr']);
    const cpnyCol = find(['CpnyId', 'CpnyID']);

    const ventasResult = await poolIntranet.request().query(`
      SELECT
        LTRIM(RTRIM([${cpnyCol}])) AS CpnyId,
        LTRIM(RTRIM([${marcaCol}])) AS Marca,
        LTRIM(RTRIM([${subMarcaCol}])) AS SubMarca,
        LTRIM(RTRIM([${versionCol}])) AS Version,
        [${anioCol}] AS Anio,
        LTRIM(RTRIM([${colorCol}])) AS Color,
        ISNULL(Periodo_Menos_3, 0) AS Periodo_Menos_3,
        ISNULL(Periodo_Menos_2, 0) AS Periodo_Menos_2,
        ISNULL(Periodo_Menos_1, 0) AS Periodo_Menos_1,
        ISNULL(Periodo_Actual, 0) AS Periodo_Actual
      FROM dbo.vw_VentasUltimos4Periodos
      ORDER BY [${subMarcaCol}], [${versionCol}], [${anioCol}], [${colorCol}]
    `);

    const invResult = await poolInventory.request().query(`
      SELECT
        LTRIM(RTRIM(CpnyID)) AS CpnyId,
        LTRIM(RTRIM(SubBrandDescr)) AS SubBrandDescr,
        SUM(ISNULL(QtyAF, 0)) AS QtyAF,
        SUM(ISNULL(QtyAP, 0)) AS QtyAP,
        SUM(ISNULL(QtyAD, 0)) AS QtyAD,
        SUM(ISNULL(QtyDP, 0)) AS QtyDP
      FROM Inventory
      WHERE QtyAF > 0 OR QtyAP > 0 OR QtyAD > 0 OR QtyDP > 0
      GROUP BY LTRIM(RTRIM(CpnyID)), LTRIM(RTRIM(SubBrandDescr))
    `);

    type InvRow = { CpnyId: string; SubBrandDescr: string } & InventoryTotals;
    const invMap = new Map<string, InventoryTotals>();

    for (const inv of invResult.recordset as InvRow[]) {
      const modelo = normalizeSubBrand(inv.SubBrandDescr);
      const key = `${inv.CpnyId.toLowerCase()}|${modelo}`;
      const existing = invMap.get(key);
      if (existing) {
        existing.QtyAF += inv.QtyAF;
        existing.QtyAP += inv.QtyAP;
        existing.QtyAD += inv.QtyAD;
        existing.QtyDP += inv.QtyDP;
      } else {
        invMap.set(key, {
          QtyAF: inv.QtyAF,
          QtyAP: inv.QtyAP,
          QtyAD: inv.QtyAD,
          QtyDP: inv.QtyDP,
        });
      }
    }

    const keyUsed = new Set<string>();
    const ventasRows = ventasResult.recordset as Record<string, unknown>[];
    const merged = ventasRows.map(v => {
      const cpny = String(v['CpnyId'] ?? '').trim().toLowerCase();
      const modelo = String(v['SubMarca'] ?? '').trim().toLowerCase();
      const key = `${cpny}|${modelo}`;
      const inv = invMap.get(key);

      if (inv && !keyUsed.has(key)) {
        keyUsed.add(key);
        return {
          ...v,
          QtyAF: inv.QtyAF,
          QtyAP: inv.QtyAP,
          Inventario: inv.QtyAF + inv.QtyAP + inv.QtyAD + inv.QtyDP,
        };
      }

      return { ...v, QtyAF: 0, QtyAP: 0, Inventario: 0 };
    });

    return merged.map(normalizeRow);
  } finally {
    await poolIntranet.close().catch(() => {});
    await poolInventory.close().catch(() => {});
  }
}
