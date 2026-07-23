export type ChecklistStatus = 1 | 2; // 1=En Proceso, 2=Completado
export type ItemResultado = true | false | null; // true=Bueno, false=Malo, null=Sin evaluar
export type TipoItem = 'boolean' | 'opciones';

export interface ChecklistSummary {
  ChecklistID: number;
  InvtID: number;
  CpnyID: number;
  Status: ChecklistStatus;
  WeekRunID?: number | null;
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
  TotalItems?: number;
}

export interface ChecklistItem {
  ItemID: number;
  ChecklistID: number;
  Categoria: string;
  Descripcion: string;
  Resultado: ItemResultado;
  Notas: string | null;
  OrderIndex: number;
  TipoItem: TipoItem;
  Opciones: string[] | null;       // opciones disponibles (solo TipoItem='opciones')
  ResultadoOpcion: string | null;  // respuesta seleccionada (solo TipoItem='opciones')
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
  Disponible?: string | number;
}

export interface TemplateItem {
  TemplateItemID: number;
  Categoria: string;
  Descripcion: string;
  OrderIndex: number;
  TipoItem: TipoItem;
  Opciones: string[] | null;  // opciones disponibles (solo TipoItem='opciones')
}

export interface WeekRunProgress {
  WeekRunID: number;
  CpnyID: number;
  WeekStartDate: string;
  TotalCreated: number;
  CompletedCount: number;
  PendingCount: number;
  Crtd_DateTime: string;
  Crtd_User: number;
  CpnyName?: string;
}

export interface WeeklyGenerateResult {
  weekStartDate: string;
  companies: Array<{
    cpnyId: number;
    cpnyName: string;
    weekRunId: number;
    created: number;
    totalCreated: number;
    skipped: number;
  }>;
  totalCreated: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
