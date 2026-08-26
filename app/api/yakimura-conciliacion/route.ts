import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';

const quantity = (row: any) =>
  Number(row.QtyAD ?? 0) + Number(row.QtyAF ?? 0) + Number(row.QtyAP ?? 0) + Number(row.QtyDP ?? 0);

export async function GET() {
  try {
    const rows = await getInventory();
    const inventory = Array.isArray(rows) ? rows : [];
    const clinica = inventory.filter((row: any) =>
      String(row.Ubicacion ?? '').toUpperCase().includes('CLINICA')
    );

    const ventasConInventario = clinica.filter((row: any) =>
      quantity(row) > 0
    );
    const inventarioSinHistorico = clinica.filter((row: any) =>
      quantity(row) === 0
    );

    const sum = (items: any[]) => items.reduce((total, row) => total + quantity(row), 0);

    return NextResponse.json({
      ventasConInventario,
      inventarioSinHistorico,
      resumen: {
        totalClinica: sum(clinica),
        emparejado: sum(ventasConInventario),
        sinHistorico: sum(inventarioSinHistorico),
        financiados: clinica.filter((r: any) => String(r.Ubicacion ?? '').toUpperCase().includes('FINANCIAD')).length,
        propios: clinica.filter((r: any) => String(r.Ubicacion ?? '').toUpperCase().includes('PROPI')).length,
        demos: clinica.filter((r: any) => String(r.Modelo ?? '').toUpperCase().includes('DEMO')).length,
        demosPropios: clinica.filter((r: any) => String(r.Modelo ?? '').toUpperCase().includes('DEMO') && String(r.Ubicacion ?? '').toUpperCase().includes('PROPI')).length
      }
    });
  } catch (error) {
    console.error('Error en conciliacion Yakimura:', error);
    return NextResponse.json({ error: 'Error al obtener conciliacion' }, { status: 500 });
  }
}
