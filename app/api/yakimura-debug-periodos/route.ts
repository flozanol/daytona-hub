import { NextResponse } from 'next/server';
import { withPool } from '../../lib/db-connection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint de diagnóstico TEMPORAL — solo lectura, no lo usa ninguna
 * pantalla. Objetivo: ver los datos CRUDOS de dbo.vw_VentasUltimos4Periodos
 * sin pasar por ninguna transformación de Yakimura, para confirmar si
 * "Periodo_Menos_1" viene realmente vacío/0 desde el origen (SQL) o si
 * es un tema de nombre de columna / de cómo se está leyendo.
 *
 * Se puede borrar este archivo en cuanto se resuelva el problema de
 * Mes -1 en blanco.
 */
export async function GET() {
  try {
    const resultado = await withPool('Intranet', async (pool) => {
      // 1) Todas las columnas que expone la vista, tal cual se llaman.
      const colResult = await pool.request().query(
        'SELECT TOP 1 * FROM dbo.vw_VentasUltimos4Periodos'
      );
      const columnas = colResult.recordset.length > 0
        ? Object.keys(colResult.recordset[0])
        : [];

      // 2) Totales agregados de las 4 columnas de periodo, sobre TODA
      //    la vista (sin filtrar por agencia ni modelo).
      const totalesResult = await pool.request().query(`
        SELECT
          COUNT(*) AS TotalFilas,
          SUM(ISNULL(Periodo_Menos_3, 0)) AS TotalMenos3,
          SUM(ISNULL(Periodo_Menos_2, 0)) AS TotalMenos2,
          SUM(ISNULL(Periodo_Menos_1, 0)) AS TotalMenos1,
          SUM(ISNULL(Periodo_Actual,  0)) AS TotalActual,
          SUM(CASE WHEN Periodo_Menos_1 IS NULL THEN 1 ELSE 0 END) AS FilasConMenos1Null,
          SUM(CASE WHEN Periodo_Menos_1 = 0 THEN 1 ELSE 0 END)     AS FilasConMenos1Cero
        FROM dbo.vw_VentasUltimos4Periodos
      `);

      // 3) Una muestra de filas con ventas recientes conocidas (Menos_2 o
      //    Menos_3 > 0), para ver a simple vista qué trae cada periodo.
      const muestraResult = await pool.request().query(`
        SELECT TOP 20
          SubMarca, Version, Anio, Color,
          Periodo_Menos_3, Periodo_Menos_2, Periodo_Menos_1, Periodo_Actual
        FROM dbo.vw_VentasUltimos4Periodos
        WHERE ISNULL(Periodo_Menos_2, 0) > 0 OR ISNULL(Periodo_Menos_3, 0) > 0
        ORDER BY Periodo_Menos_2 DESC, Periodo_Menos_3 DESC
      `);

      return {
        columnasDeLaVista: columnas,
        totales: totalesResult.recordset[0],
        muestraFilasConVentasRecientes: muestraResult.recordset,
      };
    });

    return NextResponse.json(resultado);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'Error de conexión SQL', details: msg },
      { status: 500 }
    );
  }
}
