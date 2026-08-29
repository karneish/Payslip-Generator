export interface JibbleAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  organizationId: string;
  personId: string;
}

export interface JibblePerson {
  id: string;
  organizationId?: string;
  fullName: string;
  status: string;
  timeZone?: string;
  positionName?: string;
  employmentTypeName?: string;
  pictureId?: string;
  latestTimeEntryId?: string;
  latestTimeEntryType?: string;
  latestTimeEntryTime?: string;
  groupId?: string;
  positionId?: string;
  employmentTypeId?: string;
  workStartDate?: string;
}

export interface JibbleTimeEntry {
  id: string;
  personId: string;
  organizationId: string;
  type: 'In' | 'Out' | 'StartBreak' | 'EndBreak';
  time: string;
  localTime: string;
  belongsToDate: string;
  offset: string;
  note: string | null;
  status: string;
  breakId: string | null;
  projectId: string | null;
  activityId: string | null;
  isAutomatic: boolean;
  isManual: boolean;
}

export interface JibbleDailyAttendance {
  personId: string;
  personName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  workedMinutes: number;
  workedHours: number;
  overtimeHours: number;
  firstIn: string | null;
  lastOut: string | null;
  status: string;
}

export interface JibbleSyncResult {
  synced: number;
  created: number;
  updated: number;
  failed: number;
  employeesProvisioned: number;
  errors: Array<{ employeeId: string; employeeName: string; error: string }>;
  dailySummaries: JibbleDailyAttendance[];
}

export interface JibbleApiResponse<T> {
  value?: T;
  data?: T;
  records?: T;
  '@odata.count'?: number;
}
