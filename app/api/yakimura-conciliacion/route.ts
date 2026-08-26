import { NextResponse } from 'next/server';
import { getInventory } from '@/app/lib/db';

const quantity = (row: any) =>
  Number(row.QtyAD ?? 0) + Number(row.QtyAF ?? 0) + Number(row.QtyAP ?? 0) + Number(row.QtyDP ?? 0);

const location = (row: any) => String(row.Ubicacion ?? '').toUpperCase();

export async function GET() {
  try {
    const rows = await getInventory();
    const inventory = Array.isArray(rows) ? rows : [];
    const clinica = inventory.filter((row: any) => {
      const ub = location(row);
      return ub.includes('MATRIZ') || ub.includes('CLINICA') || ub.includes('TECAMACHALCO');
    });

    const ventasConInventario = clinica.filter((row: any) => quantity(row) > 0);
    const inventarioSinHistorico = clinica.filter((row: any) => quantity(row) === 0);
    const sum = (items: any[]) => items.reduce((total, row) => total + quantity(row), 0);
    const count = (items: any[]) => items.length;
    const sample = clinica.slice(0, 10);

    return NextResponse.json({
      ventasConInventario,
      inventarioSinHistorico,
      resumen: {
        totalClinica: sum(clinica),
        emparejado: sum(ventasConInventario),
        sinHistorico: sum(inventarioSinHistorico),
        financiados: count(clinica.filter((r: any) => location(r).includes('FINANCIAD'))),
        propios: count(clinica.filter((r: any) => location(r).includes('MATRIZ') || location(r).includes('PROPI'))),
        demos: count(clinica.filter((r: any) => String(r.Modelo ?? '').toUpperCase().includes('DEMO'))),
        demosPropios: count(clinica.filter((r: any) => String(r.Modelo ?? '').toUpperCase().includes('DEMO') && (location(r).includes('MATRIZ') || location(r).includes('PROPI'))))
      },
      diagnostic: {
        rowCount: clinica.length,
        inventoryColumns: sample.length ? Object.keys(sample[0]) : [],
        sample: sample.map((row: any) => ({
          CpnyID: row.CpnyID,
          BrandDescr: row.BrandDescr,
          Modelo: row.Modelo,
          Version: row.Version,
          Anio: row.Anio,
          Color: row.Color,
          VIN: row.VIN,
          Ubicacion: row.Ubicacion,
          QtyAD: row.QtyAD,
          QtyAF: row.QtyAF,
          QtyAP: row.QtyAP,
          QtyDP: row.QtyDP
        }))
      }
    });
  } catch (error) {
    console.error('Error en conciliacion Yakimura:', error);
    return NextResponse.json({ error: 'Error al obtener conciliacion' }, { status: 500 });
  }
}
