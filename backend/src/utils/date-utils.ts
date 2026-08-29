export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (month < 1 || month > 12) {
    throw new Error("Invalid month. Must be between 1 and 12.");
  }
  return months[month - 1];
}

export function getMonthDays(month: number, year: number): number {
  if (month < 1 || month > 12) {
    throw new Error("Invalid month. Must be between 1 and 12.");
  }
  return new Date(year, month, 0).getDate();
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function formatDate(date: Date, format: string): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const monthName = getMonthName(month);
  const monthNameShort = monthName.substring(0, 3);

  const padZero = (num: number): string => (num < 10 ? "0" + num : num.toString());

  const replacements: Record<string, string> = {
    DD: padZero(day),
    D: day.toString(),
    MM: padZero(month),
    M: month.toString(),
    YYYY: year.toString(),
    YY: year.toString().slice(-2),
    MMMM: monthName,
    MMM: monthNameShort,
    HH: padZero(hours),
    H: hours.toString(),
    mm: padZero(minutes),
    m: minutes.toString(),
    ss: padZero(seconds),
    s: seconds.toString(),
  };

  let result = format;
  const patterns = Object.keys(replacements).sort((a, b) => b.length - a.length);

  for (const pattern of patterns) {
    result = result.replace(new RegExp(pattern, "g"), replacements[pattern]);
  }

  return result;
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function getMonthRange(
  month: number,
  year: number
): { startDate: Date; endDate: Date } {
  if (month < 1 || month > 12) {
    throw new Error("Invalid month. Must be between 1 and 12.");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

export function getFirstDayOfMonth(month: number, year: number): number {
  if (month < 1 || month > 12) {
    throw new Error("Invalid month. Must be between 1 and 12.");
  }
  return new Date(year, month - 1, 1).getDay();
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDaysBetween(start: Date, end: Date): number {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const diff = endTime - startTime;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getQuarter(month: number): number {
  if (month < 1 || month > 12) {
    throw new Error("Invalid month. Must be between 1 and 12.");
  }
  return Math.ceil(month / 3);
}

export function getFinancialYearDates(year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, 3, 1),
    end: new Date(year + 1, 2, 31, 23, 59, 59, 999),
  };
}
