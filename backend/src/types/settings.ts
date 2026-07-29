export interface CompanyProfileInput {
  companyName?: string;
  address?: string;
  logo?: string;
  gstNumber?: string;
  panNumber?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
  authorizedSignatory?: string;
  footerText?: string;
}

export interface SMTPConfigInput {
  host: string;
  port: number;
  username: string;
  password: string;
  senderName?: string;
  senderEmail: string;
  encryption?: string;
  isActive?: boolean;
}

export interface AppSettingInput {
  value: string;
}

export interface CompanyProfile {
  id: string;
  companyName: string;
  address: string | null;
  logo: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  authorizedSignatory: string | null;
  footerText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SMTPConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  senderName: string;
  senderEmail: string;
  encryption: string;
  isDefault: boolean;
  isActive: boolean;
  lastTestAt: Date | null;
  testStatus: string | null;
  testMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
