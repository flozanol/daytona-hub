// ─────────────────────────────────────────────
// Ventas / Yakimura
// ─────────────────────────────────────────────
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

export interface ColorRow {
  Color: string;
  p3: number;
  p2: number;
  p1: number;
  ventas3m: number;
  promedio: number;
  qtyAF: number;
  qtyAP: number;
  inventario: number;
}

export interface VersionGroup {
  key: string;
  CpnyId: string;
  Marca: string;
  SubMarca: string;
  Version: string;
  Anio: number;
  p3: number;
  p2: number;
  p1: number;
  totalVentas: number;
  promedio: number;
  qtyAF: number;
  qtyAP: number;
  inventario: number;
  colores: ColorRow[];
}

// ─────────────────────────────────────────────
// Inventario nuevos
// ─────────────────────────────────────────────
export interface InventoryRow {
  CpnyID: string;
  BrandDescr: string;
  Modelo: string;
  Version: string;
  Anio: number;
  Color: string;
  Precio: number;
  Antiguedad: number;
  VIN: string;
  CostAD: number;
  CostAF: number;
  CostAP: number;
  CostDP: number;
  QtyAD: number;
  QtyAF: number;
  QtyAP: number;
  QtyDP: number;
  Ubicacion: string;
}

// ─────────────────────────────────────────────
// Inventario seminuevos
// ─────────────────────────────────────────────
export interface SeminuevosRow {
  CpnyID: string;
  Marca: string;
  Modelo: string;
  Version: string;
  Anio: number;
  Color: string;
  PrecioVenta: number;
  Costo: number;
  Antiguedad: number;
  VIN: string;
  EstatusFinanciero: string;
}

// ─────────────────────────────────────────────
// Minutas
// ─────────────────────────────────────────────
export type MinutaEstado = 'Pendiente' | 'En Progreso' | 'Completado';
export type MinutaArea = 'Ventas' | 'Seminuevos' | 'Postventa' | 'Marketing' | 'General';

export interface Minuta {
  id: string;
  accion: string;
  responsable: string;
  fecha_limite: string;
  estado: MinutaEstado;
  area: MinutaArea;
  created_at?: string;
}
