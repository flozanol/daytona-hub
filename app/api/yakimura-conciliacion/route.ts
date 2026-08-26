import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    const result = await sql`
      WITH inv AS (
        SELECT
          i.id,
          i.marca,
          i.linea AS linea_inv,
          i.version AS version_inv,
          i.anio,
          i.clave,
          i.tipo_unidad,
          i.almacen,
          i.condicion_unidad,
          i.tipo_venta,
          i.unidades
        FROM inventario i
        WHERE i.almacen = 'CLINICA'
      ),
      hist AS (
        SELECT
          h.marca,
          h.linea AS linea_hist,
          h.version AS version_hist,
          h.anio,
          h.clave,
          SUM(h.total) AS total_historico
        FROM historico_ventas h
        WHERE h.origen = 'CLINICA'
        GROUP BY h.marca, h.linea, h.version, h.anio, h.clave
      ),
      match_valido AS (
        SELECT
          inv.id,
          inv.marca,
          inv.linea_inv,
          inv.version_inv,
          inv.anio,
          inv.clave,
          inv.tipo_unidad,
          inv.almacen,
          inv.condicion_unidad,
          inv.tipo_venta,
          inv.unidades,
          hist.total_historico
        FROM inv
        JOIN hist
          ON inv.marca = hist.marca
         AND inv.linea_inv = hist.linea_hist
         AND inv.version_inv = hist.version_hist
         AND inv.anio = hist.anio
         AND inv.clave = hist.clave
      ),
      sin_historico AS (
        SELECT
          inv.id,
          inv.marca,
          inv.linea_inv,
          inv.version_inv,
          inv.anio,
          inv.clave,
          inv.tipo_unidad,
          inv.almacen,
          inv.condicion_unidad,
          inv.tipo_venta,
          inv.unidades
        FROM inv
        LEFT JOIN hist
          ON inv.marca = hist.marca
         AND inv.linea_inv = hist.linea_hist
         AND inv.version_inv = hist.version_hist
         AND inv.anio = hist.anio
         AND inv.clave = hist.clave
        WHERE hist.marca IS NULL
      ),
      resumen AS (
        SELECT
          (SELECT SUM(unidades) FROM inv) AS total_clinica,
          (SELECT SUM(unidades) FROM match_valido) AS emparejado,
          (SELECT SUM(unidades) FROM sin_historico) AS sin_historico,
          (SELECT SUM(unidades) FROM inv WHERE tipo_venta = 'FINANCIADO') AS financiados,
          (SELECT SUM(unidades) FROM inv WHERE tipo_venta = 'PROPIO') AS propios,
          (SELECT SUM(unidades) FROM inv WHERE tipo_unidad = 'DEMO') AS demos,
          (SELECT SUM(unidades) FROM inv WHERE tipo_unidad = 'DEMO' AND tipo_venta = 'PROPIO') AS demos_propios
      )
      SELECT 'ventasConInventario' AS tipo, match_valido.* FROM match_valido
      UNION ALL
      SELECT 'inventarioSinHistorico' AS tipo, sin_historico.* FROM sin_historico
      UNION ALL
      SELECT 'resumen' AS tipo, resumen.* FROM resumen;
    `;

    const rows = result.rows ?? result;
    const ventasConInventario = rows.filter((r: any) => r.tipo === 'ventasConInventario');
    const inventarioSinHistorico = rows.filter((r: any) => r.tipo === 'inventarioSinHistorico');
    const resumen = rows.find((r: any) => r.tipo === 'resumen') || {};

    return NextResponse.json({
      ventasConInventario,
      inventarioSinHistorico,
      resumen: {
        totalClinica: resumen.total_clinica || 0,
        emparejado: resumen.emparejado || 0,
        sinHistorico: resumen.sin_historico || 0,
        financiados: resumen.financiados || 0,
        propios: resumen.propios || 0,
        demos: resumen.demos || 0,
        demosPropios: resumen.demos_propios || 0
      }
    });
  } catch (error) {
    console.error('Error en conciliacion Yakimura:', error);
    return NextResponse.json(
      { error: 'Error al obtener conciliacion' },
      { status: 500 }
    );
  }
}
