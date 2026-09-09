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
 * Gets today's date in YYYY-MM-DD format.
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
