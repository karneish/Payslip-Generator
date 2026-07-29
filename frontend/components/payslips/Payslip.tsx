'use client';

import React from "react";

/**
 * Payslip.tsx
 * A pixel-matched recreation of the payslip template layout.
 * Pass real employee data via the `data` prop - nothing here is hardcoded
 * to a specific person. Fields default to blank placeholders
 * so an empty <Payslip /> renders a clean, fillable-looking template.
 */

export interface SalaryLineItem {
  label: string;
  amount: number | null;
}

export interface PayslipData {
  companyName: string;
  companyTagline: string;
  companyWebsite: string;
  logoUrl?: string;

  monthLabel: string;
  periodLabel: string;
  payslipNo: string;

  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  employmentType: string;
  category: string;
  panNo: string;
  doj: string;
  aadharNo: string;
  uan: string;
  payMode: string;
  pfAccountNo: string;
  bankName: string;
  bankAccountNo: string;

  monthDays: number | null;
  totalPaidDays: number | null;
  presentDays: number | null;
  weeklyOff: number | null;
  netPaidDays: number | null;
  absentDays: number | null;
  paidHolidays: number | null;
  lop: number | null;
  workingDays: number | null;
  paidLeave: number | null;

  salaryItems: SalaryLineItem[];
  deductionItems: SalaryLineItem[];
  totalSalary: number | null;
  totalDeductions: number | null;

  loanBalanceTotal: number | null;
  projectDeliveryIncentive: number | null;
  fullAttendanceIncentive: number | null;

  totalNetSalary: number | null;
  amountInWords: string;
}

const blankItem = (label: string): SalaryLineItem => ({ label, amount: null });

export const defaultPayslipData: PayslipData = {
  companyName: "Company Name",
  companyTagline: "TAGLINE HERE",
  companyWebsite: "www.example.com",

  monthLabel: "MONTH YYYY",
  periodLabel: "1 \u2014 31",
  payslipNo: "PAY-0000-00-0000",

  employeeName: "\u2014",
  employeeCode: "\u2014",
  department: "\u2014",
  designation: "\u2014",
  employmentType: "\u2014",
  category: "\u2014",
  panNo: "\u2014",
  doj: "\u2014",
  aadharNo: "\u2014",
  uan: "\u2014",
  payMode: "\u2014",
  pfAccountNo: "\u2014",
  bankName: "\u2014",
  bankAccountNo: "\u2014",

  monthDays: null,
  totalPaidDays: null,
  presentDays: null,
  weeklyOff: null,
  netPaidDays: null,
  absentDays: null,
  paidHolidays: null,
  lop: null,
  workingDays: null,
  paidLeave: null,

  salaryItems: [
    blankItem("Basic Salary"),
    blankItem("HRA"),
    blankItem("Special Allowance"),
    blankItem("Conveyance Allowance"),
    blankItem("Performance Allowance"),
  ],
  deductionItems: [
    blankItem("EPF Contribution"),
    blankItem("Professional Tax"),
    blankItem("ESI"),
    blankItem("TDS"),
    blankItem("Advance recovery /loan recovery"),
  ],
  totalSalary: null,
  totalDeductions: null,

  loanBalanceTotal: null,
  projectDeliveryIncentive: null,
  fullAttendanceIncentive: null,

  totalNetSalary: null,
  amountInWords: "\u2014",
};

const formatAmount = (value: number | null): string =>
  value === null || value === undefined
    ? "Nil"
    : value.toLocaleString("en-IN");

const formatCurrency = (value: number | null): string =>
  value === null || value === undefined
    ? "\u20B9 0"
    : `\u20B9 ${value.toLocaleString("en-IN")}`;

interface PayslipProps {
  data?: Partial<PayslipData>;
}

const Payslip: React.FC<PayslipProps> = ({ data }) => {
  const d: PayslipData = { ...defaultPayslipData, ...data };

  const s = styles;

  return (
    <div style={s.page}>
      {/* ===== Header ===== */}
      <div style={s.headerRow}>
        <div style={s.brandBlock}>
          <div style={s.logoMark}>
            {d.logoUrl ? (
              <img src={d.logoUrl} alt={d.companyName} style={s.logoImg} />
            ) : (
              <span style={s.logoFallback}>
                {d.companyName.charAt(0) || "?"}
              </span>
            )}
          </div>
          <div>
            <div style={s.companyName}>{d.companyName}</div>
            <div style={s.companyTagline}>{d.companyTagline}</div>
            <div style={s.companyWebsite}>{d.companyWebsite}</div>
          </div>
        </div>

        <div style={s.titleBlock}>
          <div style={s.title}>Payslip</div>
        </div>

        <div style={s.periodBlock}>
          <div style={s.periodLabelTop}>Payslip For the Month</div>
          <div style={s.monthLabel}>{d.monthLabel}</div>
          <div style={s.periodSub}>({d.periodLabel})</div>
        </div>
      </div>

      <div style={s.headerDivider} />

      {/* ===== Employee Details + Net Payable box ===== */}
      <div style={s.detailsRow}>
        <div style={s.detailsCol}>
          <div style={s.sectionLabel}>EMPLOYEE DETAILS</div>
          <div style={s.detailsGrid}>
            <DetailPair label="Employee name" value={d.employeeName} />
            <DetailPair label="Employee Code" value={d.employeeCode} />
            <DetailPair label="Department" value={d.department} />
            <DetailPair label="Designation" value={d.designation} />
            <DetailPair label="Employment Type" value={d.employmentType} />
            <DetailPair label="Category" value={d.category} />
            <DetailPair label="PAN No" value={d.panNo} />
            <DetailPair label="DOJ" value={d.doj} />
            <DetailPair label="Aadhar No." value={d.aadharNo} />
            <DetailPair label="UAN" value={d.uan} />
            <DetailPair label="Pay Mode" value={d.payMode} />
            <DetailPair label="PF A/c No" value={d.pfAccountNo} />
            <DetailPair label="Bank Name" value={d.bankName} />
            <DetailPair label="Bank A/c No" value={d.bankAccountNo} />
          </div>
        </div>

        <div style={s.netPayableBox}>
          <div style={s.netPayableAmount}>
            {formatCurrency(d.totalNetSalary)}
          </div>
          <div style={s.netPayableLabel}>TOTAL NET PAYABLE</div>
        </div>
      </div>

      {/* ===== Attendance Summary ===== */}
      <div style={s.attendanceSection}>
        <div style={s.sectionLabelUnderline}>ATTENDANCE SUMMARY</div>
        <div style={s.attendanceGrid}>
          <DetailPair label="Month Days" value={d.monthDays ?? "\u2014"} />
          <DetailPair label="Total Paid Days" value={d.totalPaidDays ?? "\u2014"} />
          <DetailPair label="Present Days" value={d.presentDays ?? "\u2014"} />

          <DetailPair label="Weekly-Off" value={d.weeklyOff ?? "\u2014"} />
          <DetailPair label="Net Paid Days" value={d.netPaidDays ?? "\u2014"} />
          <DetailPair label="Absent Days" value={d.absentDays ?? "\u2014"} />

          <DetailPair label="Paid Holidays" value={d.paidHolidays ?? "\u2014"} />
          <DetailPair label="LOP" value={d.lop ?? "Nil"} />
          <div />

          <DetailPair label="Working Days" value={d.workingDays ?? "\u2014"} />
          <DetailPair label="Paid leave" value={d.paidLeave ?? "\u2014"} />
          <div />
        </div>
      </div>

      {/* ===== Salary / Deductions Table ===== */}
      <div style={s.tableWrap}>
        <div style={s.tableHeaderRow}>
          <div style={s.tableHeaderCell}>Salary</div>
          <div style={s.tableHeaderCellAmount}>Amount Rs.</div>
          <div style={s.tableHeaderCell}>Deductions</div>
          <div style={s.tableHeaderCellAmount}>Amount Rs.</div>
        </div>

        {Array.from({
          length: Math.max(d.salaryItems.length, d.deductionItems.length),
        }).map((_, i) => {
          const sal = d.salaryItems[i];
          const ded = d.deductionItems[i];
          return (
            <div style={s.tableRow} key={i}>
              <div style={s.tableCell}>{sal?.label ?? ""}</div>
              <div style={s.tableCellAmount}>
                {sal ? formatAmount(sal.amount) : ""}
              </div>
              <div style={s.tableCell}>{ded?.label ?? ""}</div>
              <div style={s.tableCellAmount}>
                {ded ? formatAmount(ded.amount) : ""}
              </div>
            </div>
          );
        })}

        <div style={s.tableTotalRow}>
          <div style={s.tableTotalCell}>Total Salary</div>
          <div style={s.tableTotalAmount}>{formatAmount(d.totalSalary)}</div>
          <div style={s.tableTotalCell}>Total Deductions</div>
          <div style={s.tableTotalAmount}>
            {formatAmount(d.totalDeductions)}
          </div>
        </div>
      </div>

      {/* ===== Loan Balance / Extra Bonus ===== */}
      <div style={s.loanBonusRow}>
        <div style={s.loanBonusCol}>
          <div style={s.sectionLabel}>Loan Balance</div>
          <div style={s.loanBonusLine}>
            <span style={s.loanBonusKey}>Total</span>
            <span>: {formatAmount(d.loanBalanceTotal)}</span>
          </div>
        </div>
        <div style={s.loanBonusColWide}>
          <div style={s.sectionLabel}>Extra Bonus</div>
          <div style={s.loanBonusLine}>
            <span style={s.loanBonusKey}>Project Delivery Incentive</span>
            <span>: {formatAmount(d.projectDeliveryIncentive)}</span>
            <span style={{ ...s.loanBonusKey, marginLeft: 24 }}>
              Full Attendance Incentive
            </span>
            <span>: {formatAmount(d.fullAttendanceIncentive)}</span>
          </div>
        </div>
      </div>

      {/* ===== Total Net Salary ===== */}
      <div style={s.totalNetRow}>
        <div>
          <div style={s.totalNetLabel}>TOTAL NET SALARY</div>
          <div style={s.totalNetSub}>Gross Salary - Total Deductions</div>
        </div>
        <div style={s.totalNetAmount}>{formatCurrency(d.totalNetSalary)}</div>
      </div>

      {/* ===== Amount in words ===== */}
      <div style={s.amountWords}>AMOUNT IN WORDS : {d.amountInWords}</div>

      {/* ===== Footer ===== */}
      <div style={s.footerDivider} />
      <div style={s.confidentialNote}>
        This payslip is confidential and intended solely for the employee
        named above. Unauthorized sharing, modification, or misuse may be
        subject to Company policy.
      </div>
      <div style={s.autoGenNote}>
        -This document has been automatically generated by{" "}
        <strong>{d.companyName}</strong> Payroll: therefore, a signature not
        required.-
      </div>

      <div style={s.payslipNoTag}>Payslip No : {d.payslipNo}</div>
    </div>
  );
};

const DetailPair: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div style={styles.detailPair}>
    <span style={styles.detailLabel}>{label}</span>
    <span style={styles.detailColon}>:</span>
    <span style={styles.detailValue}>{value}</span>
  </div>
);

const NAVY = "#2b2f5e";
const LAVENDER_BG = "#e7e5f5";
const BORDER = "#d9d9e3";
const TEXT = "#2b2b2b";
const MUTED = "#6b6b76";

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: 820,
    margin: "0 auto",
    padding: "40px 48px",
    fontFamily:
      "'Segoe UI', Arial, Helvetica, sans-serif",
    color: TEXT,
    background: "#ffffff",
    boxSizing: "border-box",
    fontSize: 13,
    lineHeight: 1.4,
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  brandBlock: { display: "flex", alignItems: "center", gap: 12, flex: 1 },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: NAVY,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%", objectFit: "cover" },
  logoFallback: { color: "#fff", fontWeight: 700, fontSize: 20 },
  companyName: { fontWeight: 700, fontSize: 17, color: TEXT },
  companyTagline: { fontSize: 10, letterSpacing: 1, color: MUTED },
  companyWebsite: { fontSize: 10, color: MUTED, marginTop: 2 },
  titleBlock: { flex: 1, textAlign: "center" },
  title: { fontSize: 26, fontWeight: 700, color: TEXT },
  periodBlock: { flex: 1, textAlign: "right" },
  periodLabelTop: { fontSize: 11, color: MUTED },
  monthLabel: { fontSize: 15, fontWeight: 700, color: TEXT },
  periodSub: { fontSize: 11, color: MUTED },
  headerDivider: {
    borderTop: `1px solid ${BORDER}`,
    margin: "16px 0 20px",
  },
  detailsRow: { display: "flex", gap: 20, alignItems: "flex-start" },
  detailsCol: { flex: 1 },
  sectionLabel: {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 10,
    color: TEXT,
  },
  sectionLabelUnderline: {
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 10,
    color: TEXT,
    borderTop: `1px dashed ${BORDER}`,
    paddingTop: 12,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    rowGap: 8,
    columnGap: 16,
  },
  detailPair: { display: "flex", fontSize: 12.5 },
  detailLabel: { color: MUTED, minWidth: 118 },
  detailColon: { marginRight: 6, color: MUTED },
  detailValue: { fontWeight: 600, color: TEXT },
  netPayableBox: {
    background: LAVENDER_BG,
    borderRadius: 8,
    padding: "18px 22px",
    minWidth: 180,
    textAlign: "left",
    borderLeft: `4px solid ${NAVY}`,
  },
  netPayableAmount: { fontSize: 24, fontWeight: 700, color: TEXT },
  netPayableLabel: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: MUTED,
    marginTop: 6,
    fontWeight: 700,
  },
  attendanceSection: { marginTop: 18 },
  attendanceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    rowGap: 8,
    columnGap: 16,
  },
  tableWrap: { marginTop: 22, borderTop: `1px solid ${BORDER}` },
  tableHeaderRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto",
    columnGap: 20,
    padding: "12px 0 8px",
    fontWeight: 700,
    fontSize: 12.5,
    borderBottom: `1px solid ${BORDER}`,
  },
  tableHeaderCell: {},
  tableHeaderCellAmount: { textAlign: "right", minWidth: 90 },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto",
    columnGap: 20,
    padding: "9px 0",
    fontSize: 12.5,
    borderBottom: `1px dashed ${BORDER}`,
  },
  tableCell: { color: TEXT },
  tableCellAmount: { textAlign: "right", minWidth: 90 },
  tableTotalRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto",
    columnGap: 20,
    padding: "12px 0",
    fontWeight: 700,
    fontSize: 13,
    borderTop: `1px solid ${BORDER}`,
    marginTop: 4,
  },
  tableTotalCell: {},
  tableTotalAmount: { textAlign: "right", minWidth: 90 },
  loanBonusRow: {
    display: "flex",
    gap: 40,
    marginTop: 22,
    paddingTop: 14,
    borderTop: `1px solid ${BORDER}`,
  },
  loanBonusCol: { minWidth: 140 },
  loanBonusColWide: { flex: 1 },
  loanBonusLine: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    fontSize: 12.5,
  },
  loanBonusKey: { color: MUTED, marginRight: 4 },
  totalNetRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: LAVENDER_BG,
    borderRadius: 8,
    padding: "16px 22px",
    marginTop: 22,
  },
  totalNetLabel: { fontWeight: 700, fontSize: 13 },
  totalNetSub: { fontSize: 10.5, color: MUTED, marginTop: 2 },
  totalNetAmount: { fontSize: 22, fontWeight: 700 },
  amountWords: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.3,
  },
  footerDivider: { borderTop: `1px solid ${BORDER}`, margin: "22px 0 14px" },
  confidentialNote: {
    fontSize: 10.5,
    color: MUTED,
    textAlign: "center",
    lineHeight: 1.5,
  },
  autoGenNote: {
    fontSize: 10,
    color: MUTED,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  payslipNoTag: {
    position: "absolute",
    top: 40,
    right: 48,
    fontSize: 10.5,
    color: MUTED,
    display: "none",
  },
};

export default Payslip;
