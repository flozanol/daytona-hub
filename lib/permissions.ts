const ADMIN_EMAILS: readonly string[] = [
  'rmendoza@grupodaytona.com',
  'flozano@grupodaytona.com',
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Admins ven todos los checklists (CpnyID=0); regulares solo los suyos */
export function canViewAll(email: string): boolean {
  return isAdmin(email);
}

/** Solo admins pueden eliminar un checklist */
export function canDelete(email: string): boolean {
  return isAdmin(email);
}

/** Solo admins pueden agregar / eliminar ítems (estructura del checklist) */
export function canManageItems(email: string): boolean {
  return isAdmin(email);
}

/**
 * Evaluar Bueno/Malo y notas.
 * El alcance por empresa se valida en la API contra checklist.CpnyID.
 */
export function canEvaluateItems(_email: string): boolean {
  return true;
}

/**
 * Cambiar status (En Proceso → Completado).
 * El alcance por empresa se valida en la API contra checklist.CpnyID.
 */
export function canChangeStatus(_email: string): boolean {
  return true;
}

/** Todos los usuarios autenticados pueden crear checklists para su empresa */
export function canCreate(_email: string): boolean {
  return true;
}
