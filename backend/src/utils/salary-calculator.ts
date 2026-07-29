export interface WorkingDaysResult {
  year: number;
  month: number;
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  saturdays: number;
  sundays: number;
  isLeapYear: boolean;
}

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  da: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  overtime: number;
  bonus: number;
  reimbursement: number;
  grossSalary: number;
}

export interface DeductionBreakdown {
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  leaveDeduction: number;
  lateDeduction: number;
  otherDeductions: number;
  advanceDeduction: number;
  totalDeductions: number;
}

export function calculateWorkingDays(year: number, month: number): WorkingDaysResult {
  const totalDays = new Date(year, month, 0).getDate();
  const isLeap = isLeapYear(year);
  let saturdays = 0;
  let sundays = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) {
      sundays++;
    } else if (dayOfWeek === 6) {
      saturdays++;
    }
  }

  const weekendDays = saturdays + sundays;
  const workingDays = totalDays - weekendDays;

  return {
    year,
    month,
    totalDays,
    workingDays,
    weekendDays,
    saturdays,
    sundays,
    isLeapYear: isLeap,
  };
}

export function calculateGrossSalary(
  basic: number,
  hra: number,
  da: number,
  medical: number,
  travel: number,
  special: number,
  other: number
): number {
  return basic + hra + da + medical + travel + special + other;
}

export function calculatePFDeduction(basic: number): number {
  const pfAmount = basic * 0.12;
  return Math.min(pfAmount, 1800);
}

export function calculateESIDeduction(grossSalary: number): number {
  if (grossSalary <= 21000) {
    return grossSalary * 0.0075;
  }
  return 0;
}

export function calculateProfessionalTax(grossSalary: number): number {
  if (grossSalary < 15000) {
    return 0;
  } else if (grossSalary >= 15000 && grossSalary <= 20000) {
    return 150;
  } else if (grossSalary > 20000 && grossSalary <= 30000) {
    return 200;
  } else {
    return 300;
  }
}

export function calculateTotalDeductions(
  pf: number,
  esi: number,
  pt: number,
  incomeTax: number,
  leave: number,
  late: number,
  other: number,
  advance: number
): number {
  return pf + esi + pt + incomeTax + leave + late + other + advance;
}

export function calculateNetSalary(gross: number, deductions: number): number {
  const net = gross - deductions;
  return net > 0 ? net : 0;
}

export function calculatePayableDays(
  workingDays: number,
  leaveDays: number,
  lopDays: number
): number {
  const payable = workingDays - leaveDays - lopDays;
  return payable > 0 ? payable : 0;
}

export function roundOffAmount(amount: number): number {
  return Math.round(amount);
}

export function convertToWords(amount: number): string {
  if (amount === 0) {
    return "Zero";
  }

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const isNegative = amount < 0;
  let num = Math.abs(Math.round(amount));
  const paise = Math.round((Math.abs(amount) - Math.floor(Math.abs(amount))) * 100);

  if (num === 0 && paise === 0) {
    return "Zero";
  }

  let result = "";

  if (num >= 10000000) {
    const crores = Math.floor(num / 10000000);
    result += convertBelowCrore(crores, ones, tens) + " Crore ";
    num = num % 10000000;
  }

  if (num >= 100000) {
    const lakhs = Math.floor(num / 100000);
    result += convertBelowLakh(lakhs, ones, tens) + " Lakh ";
    num = num % 100000;
  }

  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    result += convertBelowThousand(thousands, ones, tens) + " Thousand ";
    num = num % 1000;
  }

  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    result += ones[hundreds] + " Hundred ";
    num = num % 100;
  }

  if (num > 0) {
    if (num < 20) {
      result += ones[num];
    } else {
      result += tens[Math.floor(num / 10)];
      if (num % 10 > 0) {
        result += " " + ones[num % 10];
      }
    }
  }

  result = result.trim() + " Rupees";

  if (paise > 0) {
    result += " and ";
    if (paise < 20) {
      result += ones[paise];
    } else {
      result += tens[Math.floor(paise / 10)];
      if (paise % 10 > 0) {
        result += " " + ones[paise % 10];
      }
    }
    result += " Paise";
  }

  result += " Only";

  return isNegative ? "Minus " + result : result;
}

function convertBelowCrore(num: number, ones: string[], tens: string[]): string {
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    let result = ones[hundreds] + " Hundred";
    if (remainder > 0) {
      result += " " + convertBelowHundred(remainder, ones, tens);
    }
    return result;
  }
  return convertBelowHundred(num, ones, tens);
}

function convertBelowLakh(num: number, ones: string[], tens: string[]): string {
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    let result = ones[hundreds] + " Hundred";
    if (remainder > 0) {
      result += " " + convertBelowHundred(remainder, ones, tens);
    }
    return result;
  }
  return convertBelowHundred(num, ones, tens);
}

function convertBelowThousand(num: number, ones: string[], tens: string[]): string {
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    let result = ones[hundreds] + " Hundred";
    if (remainder > 0) {
      result += " " + convertBelowHundred(remainder, ones, tens);
    }
    return result;
  }
  return convertBelowHundred(num, ones, tens);
}

function convertBelowHundred(num: number, ones: string[], tens: string[]): string {
  if (num < 20) {
    return ones[num];
  }
  let result = tens[Math.floor(num / 10)];
  if (num % 10 > 0) {
    result += " " + ones[num % 10];
  }
  return result;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}
