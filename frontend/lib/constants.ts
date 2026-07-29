export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NUMBERS: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
};

export const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

export const EMPLOYMENT_STATUSES = ['Active', 'Inactive', 'On Notice', 'Terminated'];

export const EMPLOYMENT_STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-900/50 text-green-300 border border-green-700/50',
  Inactive: 'bg-red-900/50 text-red-300 border border-red-700/50',
  'On Notice': 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  Terminated: 'bg-gray-800 text-gray-400 border border-gray-600/50',
  ACTIVE: 'bg-green-900/50 text-green-300 border border-green-700/50',
  INACTIVE: 'bg-red-900/50 text-red-300 border border-red-700/50',
  'ON NOTICE': 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  TERMINATED: 'bg-gray-800 text-gray-400 border border-gray-600/50',
};

export const normalizeEmploymentStatus = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    'ON NOTICE': 'On Notice',
    TERMINATED: 'Terminated',
  };
  return map[status?.toUpperCase()] || status;
};

export const PAYSLIP_STATUSES = ['DRAFT', 'GENERATED', 'APPROVED', 'PAID', 'CANCELLED'] as const;

export const PAYSLIP_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-800 text-gray-300 border border-gray-600/50',
  GENERATED: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
  APPROVED: 'bg-green-900/50 text-green-300 border border-green-700/50',
  PAID: 'bg-purple-900/50 text-purple-300 border border-purple-700/50',
  CANCELLED: 'bg-red-900/50 text-red-300 border border-red-700/50',
};

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  Present: 'bg-green-900/50 text-green-300 border border-green-700/50',
  Absent: 'bg-red-900/50 text-red-300 border border-red-700/50',
  Leave: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  Holiday: 'bg-purple-900/50 text-purple-300 border border-purple-700/50',
  Weekend: 'bg-gray-800 text-gray-400 border border-gray-600/50',
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
