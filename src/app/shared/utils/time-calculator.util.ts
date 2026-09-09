/**
 * Calculates net worked hours from entry, exit, and lunch break.
 * @param entrada - Time string in HH:mm format
 * @param salida - Time string in HH:mm format
 * @param minutosAlmuerzo - Lunch break in minutes
 * @returns Decimal hours (e.g., 8.5 = 8h 30m). Returns 0 if invalid.
 */
export function calculateWorkedHours(
  entrada: string,
  salida: string,
  minutosAlmuerzo: number
): number {
  if (!entrada || !salida) return 0;

  const [entH, entM] = entrada.split(':').map(Number);
  const [salH, salM] = salida.split(':').map(Number);

  const entradaMin = entH * 60 + entM;
  const salidaMin = salH * 60 + salM;

  if (salidaMin <= entradaMin) return 0;

  const totalMin = salidaMin - entradaMin - minutosAlmuerzo;
  if (totalMin <= 0) return 0;

  // Round to 2 decimal places
  return Math.round((totalMin / 60) * 100) / 100;
}

/**
 * Checks if hours exceed the standard 8h workday.
 */
export function isOvertime(horas: number): boolean {
  return horas > 8;
}

/**
 * Gets today's date in YYYY-MM-DD format using local time, so the date shown
 * matches the user's calendar day rather than UTC.
 */
export function todayISO(): string {
  return toLocalISO(new Date());
}

/** Date N days before today, in YYYY-MM-DD format. */
export function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalISO(date);
}

/** First day of the current month, in YYYY-MM-DD format. */
export function firstDayOfMonthISO(): string {
  const now = new Date();
  return toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1));
}

function toLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
