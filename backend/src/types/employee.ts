export interface CreateEmployeeInput {
  employeeCode: string;
  employeeName: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  designation?: string;
  panNumber?: string;
  aadharNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  joiningDate?: string;
  employmentStatus?: string;
  basicSalary?: number;
  hra?: number;
  da?: number;
  medicalAllowance?: number;
  travelAllowance?: number;
  specialAllowance?: number;
  otherAllowances?: number;
}

export interface UpdateEmployeeInput {
  employeeCode?: string;
  employeeName?: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
  designation?: string;
  panNumber?: string;
  aadharNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  joiningDate?: string;
  employmentStatus?: string;
  basicSalary?: number;
  hra?: number;
  da?: number;
  medicalAllowance?: number;
  travelAllowance?: number;
  specialAllowance?: number;
  otherAllowances?: number;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  designation?: string;
  employmentStatus?: string;
  status?: string;
  dateOfJoiningFrom?: Date;
  dateOfJoiningTo?: Date;
}

export interface EmployeeResponse {
  id: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  panNumber: string;
  aadharNumber: string;
  uanNumber: string | null;
  pfNumber: string | null;
  esiNumber: string | null;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  joiningDate: Date;
  employmentStatus: string;
  jibbleEmployeeId: string | null;
  jibbleUserId: string | null;
  syncStatus: string | null;
  lastSyncTime: Date | null;
  attendanceStatus: string | null;
  basicSalary: number;
  hra: number;
  da: number;
  medicalAllowance: number;
  travelAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  netSalary: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedEmployees {
  data: EmployeeResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
