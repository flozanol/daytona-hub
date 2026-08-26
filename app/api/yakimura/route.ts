import { NextResponse } from 'next/server';
import { db } from '../../lib/db';

export async function GET() {
  try {
    const result = await db.query(`
      SELECT 
        v.CpnyId,
        v.Marca,
        v.SubMarca,
        v.Version,
        v.Anio,
        v.Color,
        v.Periodo_Menos_3,
        v.Periodo_Menos_2,
        v.Periodo_Menos_1,
        v.Periodo_Actual,
        ISNULL(i.QtyAF, 0) AS QtyAF,
        ISNULL(i.QtyAP, 0) AS QtyAP,
        ISNULL(i.QtyAD, 0) AS QtyAD,
        ISNULL(i.QtyDP, 0) AS QtyDP,
        (ISNULL(i.QtyAF, 0) + ISNULL(i.QtyAP, 0)) AS Inventario
      FROM dbo.vw_VentasUltimos4Periodos v
      LEFT JOIN dbo.vw_InventarioAN i 
        ON v.CpnyId = i.CpnyID 
        AND v.SubMarca = i.Model
        AND v.Version = i.Version
        AND v.Anio = i.ModelYear
        AND v.Color = i.ColorDescr
      WHERE i.BrandDescr != 'OTRO' OR i.BrandDescr IS NULL
      ORDER BY v.CpnyId, v.Marca, v.SubMarca, v.Version, v.Anio, v.Color
    `);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en API Yakimura:', error);
    return NextResponse.json(
      { error: 'Error al consultar datos Yakimura' },
      { status: 500 }
    );
  }
}
