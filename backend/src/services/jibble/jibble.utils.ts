export function calculateWorkedHours(
  clockIn: string,
  clockOut: string,
  breakMinutes: number
): number {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const totalMs = end.getTime() - start.getTime();
  const totalMinutes = totalMs / (1000 * 60) - breakMinutes;
  return Math.max(0, totalMinutes / 60);
}

export function calculateOvertime(workedHours: number, standardHours: number = 8): number {
  return Math.max(0, workedHours - standardHours);
}

export function formatJibbleDate(date: Date): string {
  return date.toISOString();
}

export function parseJibbleClockTime(timeStr: string): Date {
  const parsed = new Date(timeStr);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid Jibble time string: ${timeStr}`);
  }
  return parsed;
}
