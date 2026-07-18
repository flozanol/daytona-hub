// ─────────────────────────────────────────────
// Financiero — Plan de piso
// Actualizar TIIE cuando cambie la tasa de referencia.
// ─────────────────────────────────────────────
export const TIIE = 6.7458;
export const PUNTOS_ADICIONALES = 2;
export const TASA_ANUAL = (TIIE + PUNTOS_ADICIONALES) / 100;

// ─────────────────────────────────────────────
// Agencias / Compañías
// ─────────────────────────────────────────────
export type CpnyInfo = { nombre: string; sector: 'AUTOS' | 'MOTOS' };

export const CPNY_MAP: Record<string, CpnyInfo> = {
  // MOTOS
  'TEC':   { nombre: 'Motos Tecamachalco',       sector: 'MOTOS' },
  'IZT':   { nombre: 'Motos Iztapalapa',          sector: 'MOTOS' },
  'SAT':   { nombre: 'Motos Satélite',             sector: 'MOTOS' },
  'ECA':   { nombre: 'Motos Ecatepec',             sector: 'MOTOS' },
  'CUE':   { nombre: 'Motos Cuernavaca',           sector: 'MOTOS' },
  'CUU':   { nombre: 'Motos Cuautla',              sector: 'MOTOS' },
  'SATPH': { nombre: 'Motos Satélite Power House', sector: 'MOTOS' },
  'TLN':   { nombre: 'Motos Tlalnepantla',         sector: 'MOTOS' },
  'ATX':   { nombre: 'Motos Atlixco',              sector: 'MOTOS' },
  // AUTOS
  '001':   { nombre: 'KIA Interlomas',             sector: 'AUTOS' },
  '002':   { nombre: 'KIA Iztapalapa',             sector: 'AUTOS' },
  'MGINT': { nombre: 'MG Interlomas',              sector: 'AUTOS' },
  'MGSFE': { nombre: 'MG Santa Fe',               sector: 'AUTOS' },
  'MGIZT': { nombre: 'MG Iztapalapa',             sector: 'AUTOS' },
  'MGCUA': { nombre: 'MG Cuajimalpa',             sector: 'AUTOS' },
  'GWCUE': { nombre: 'GWM Cuernavaca',            sector: 'AUTOS' },
  'GWIZT': { nombre: 'GWM Iztapalapa',            sector: 'AUTOS' },
  'CUA':   { nombre: 'Honda Cuajimalpa',           sector: 'AUTOS' },
  'INT':   { nombre: 'Honda Interlomas',           sector: 'AUTOS' },
  'ACUI':  { nombre: 'Acura Interlomas',           sector: 'AUTOS' },
  'AS25':  { nombre: 'Acura Interlomas',           sector: 'AUTOS' },
};

export function getCpnyNombre(cpnyId: string): string {
  return CPNY_MAP[cpnyId]?.nombre ?? cpnyId;
}
