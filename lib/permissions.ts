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

/** Solo admins pueden agregar / editar / eliminar ítems */
export function canManageItems(email: string): boolean {
  return isAdmin(email);
}

/** Solo admins pueden cambiar el status (En proceso → Completado) */
export function canChangeStatus(email: string): boolean {
  return isAdmin(email);
}

/** Todos los usuarios autenticados pueden crear checklists para su empresa */
export function canCreate(_email: string): boolean {
  return true;
}
