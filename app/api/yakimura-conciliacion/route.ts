import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';

export async function GET() {
  try {
    const rows = await getInventory();
    const inventory = Array.isArray(rows) ? rows : [];
    const clinica = inventory.filter((row: any) => String(row.almacen ?? row.agencia ?? '').toUpperCase() === 'CLINICA');

    const ventasConInventario = clinica.filter((row: any) =>
      row.total_historico != null || row.totalHistorico != null || row.ventas_historicas != null
    );
    const inventarioSinHistorico = clinica.filter((row: any) =>
      row.total_historico == null && row.totalHistorico == null && row.ventas_historicas == null
    );

    const sum = (items: any[], key: string) => items.reduce((total, row) => total + Number(row[key] ?? 0), 0);
    const totalClinica = sum(clinica, 'unidades') || clinica.length;
    const emparejado = sum(ventasConInventario, 'unidades') || ventasConInventario.length;
    const sinHistorico = sum(inventarioSinHistorico, 'unidades') || inventarioSinHistorico.length;

    return NextResponse.json({
      ventasConInventario,
      inventarioSinHistorico,
      resumen: {
        totalClinica,
        emparejado,
        sinHistorico,
        financiados: clinica.filter((r: any) => String(r.tipo_venta ?? r.tipoVenta ?? '').toUpperCase() === 'FINANCIADO').length,
        propios: clinica.filter((r: any) => String(r.tipo_venta ?? r.tipoVenta ?? '').toUpperCase() === 'PROPIO').length,
        demos: clinica.filter((r: any) => String(r.tipo_unidad ?? r.tipoUnidad ?? '').toUpperCase() === 'DEMO').length,
        demosPropios: clinica.filter((r: any) => String(r.tipo_unidad ?? r.tipoUnidad ?? '').toUpperCase() === 'DEMO' && String(r.tipo_venta ?? r.tipoVenta ?? '').toUpperCase() === 'PROPIO').length
      }
    });
  } catch (error) {
    console.error('Error en conciliacion Yakimura:', error);
    return NextResponse.json({ error: 'Error al obtener conciliacion' }, { status: 500 });
  }
}
