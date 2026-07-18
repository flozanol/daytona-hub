/** Lunes de la semana actual en America/Mexico_City → YYYY-MM-DD */
export function getWeekStartDateMX(now: Date = new Date()): string {
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = utcNoon.getUTCDay(); // 0=Sun … 6=Sat
  const daysFromMonday = (weekday + 6) % 7;
  utcNoon.setUTCDate(utcNoon.getUTCDate() - daysFromMonday);
  return utcNoon.toISOString().slice(0, 10);
}

/** Domingo de esa semana (WeekStartDate + 6) → YYYY-MM-DD */
export function getWeekEndDate(weekStartDate: string): string {
  const [y, m, d] = weekStartDate.slice(0, 10).split('-').map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  utcNoon.setUTCDate(utcNoon.getUTCDate() + 6);
  return utcNoon.toISOString().slice(0, 10);
}

export function formatWeekDay(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "13 jul 2026 – 19 jul 2026" */
export function formatWeekRange(weekStartDate: string): string {
  return `${formatWeekDay(weekStartDate)} – ${formatWeekDay(getWeekEndDate(weekStartDate))}`;
}
