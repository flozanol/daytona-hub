export type ChecklistStatus = 1 | 2; // 1=En proceso, 2=Completado
export type ItemResultado = true | false | null; // true=Bueno, false=Malo, null=Sin evaluar

export interface ChecklistSummary {
  ChecklistID: number;
  InvtID: number;
  CpnyID: number;
  Status: ChecklistStatus;
  Crtd_DateTime: string;
  Crtd_User: number;
  Lupd_DateTime: string | null;
  // JOIN con Intranet_InvtSmnvos
  SLInvtID?: string;
  VIN?: string;
  Marca?: string;
  SubMarca?: string;
  Version?: string;
  ModeloYr?: number;
  CExterior?: string;
  CpnyName?: string;
}

export interface ChecklistItem {
  ItemID: number;
  ChecklistID: number;
  Categoria: string;
  Descripcion: string;
  Resultado: ItemResultado;
  Notas: string | null;
  OrderIndex: number;
}

export interface VehicleRow {
  InvtID: number;
  SLInvtID: string;
  VIN: string;
  CpnyID: number;
  CpnyName: string;
  Marca: string;
  SubMarca: string;
  Version: string;
  ModeloYr: number;
  Kilometraje: string;
  CExterior: string;
  Precio: number;
  Age: number;
}

export interface TemplateItem {
  TemplateItemID: number;
  Categoria: string;
  Descripcion: string;
  OrderIndex: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
