import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { convertToWords as salaryToWords } from '../utils/salary-calculator';

const OUTPUT_DIR = path.join(__dirname, '../../uploads/payslips/');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

function formatRupee(amount: number): string {
  return '\u20B9 ' + Math.round(amount).toLocaleString('en-IN');
}

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function valOrDash(v: any): string {
  if (v === null || v === undefined || v === '') return '\u2014';
  return esc(String(v));
}

function formatRupeeOrNil(amount: number): string {
  return amount > 0 ? formatRupee(amount) : 'Nil';
}

function logoToDataUri(logoPath: string): string {
  if (!fs.existsSync(logoPath)) return '';
  const ext = path.extname(logoPath).toLowerCase().replace('.', '');
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  };
  const mime = mimeMap[ext] || 'image/png';
  const buffer = fs.readFileSync(logoPath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function buildPayslipHtml(payslip: any, employee: any, companyProfile: any): string {
  const monthName = MONTHS[payslip.month - 1];
  const monthShort = MONTHS_SHORT[payslip.month - 1];
  const totalDaysInMonth = new Date(payslip.year, payslip.month, 0).getDate();
  const firstDay = `01 ${monthShort}`;
  const lastDay = `${totalDaysInMonth} ${monthShort}`;
  const payslipNo = `PAY-${payslip.year}-${String(payslip.month).padStart(2, '0')}-${employee.employeeCode || '0001'}`;

  let logoSrc = '';
  if (companyProfile?.logo) {
    const lp = path.resolve(companyProfile.logo);
    if (fs.existsSync(lp)) logoSrc = logoToDataUri(lp);
  }
  if (!logoSrc) {
    const candidates = [
      path.resolve('public/logo.png'),
      path.join(__dirname, '../../../public/logo.png'),
      path.join(__dirname, '../../public/logo.png'),
      path.join(__dirname, '../../../../frontend/public/logo.png'),
    ];
    for (const fb of candidates) {
      if (fs.existsSync(fb)) { logoSrc = logoToDataUri(fb); break; }
    }
  }
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="Company Logo" style="width:65px;height:65px;flex-shrink:0;">`
    : '<div class="logo-placeholder">LOGO</div>';

  const totalEarnings = payslip.totalEarnings || payslip.grossSalary || 0;
  const totalDeductions = payslip.totalDeductions || 0;
  const netSalary = payslip.netSalary || 0;
  const amountInWords = payslip.amountInWords || salaryToWords(Math.round(netSalary));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payslip - ${esc(employee.employeeName)} - ${monthName} ${payslip.year}</title>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  color: #1a1a1a;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@page {
  size: A4;
  margin: 0;
}

.page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 15mm 15mm;
  background: #ffffff;
  position: relative;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    box-shadow: none;
    margin: 0;
    width: auto;
    min-height: auto;
  }
}

@media screen {
  body {
    background: #e5e5e5;
    padding: 20px 0;
  }
  .page {
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.15);
  }
}

:root {
  --accent-purple: #7b74b8;
  --accent-purple-dark: #6a63a8;
  --panel-bg: #e9e7f5;
  --line-grey: #333333;
  --text-grey: #444444;
  --dashed-grey: #999999;
}

/* ===================== HEADER ===================== */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid #444444;
}

.header-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-placeholder {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border: 1px dashed #999999;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #999999;
  text-align: center;
  line-height: 1.2;
  background: #f5f5f5;
}

.header-center {
  flex: 1;
  text-align: center;
}

.header-center h1 {
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.header-right {
  flex: 0 0 auto;
  text-align: right;
  font-size: 11px;
  line-height: 1.5;
}

.header-right .month {
  font-weight: bold;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.header-right .range {
  font-size: 11px;
  color: var(--text-grey);
}

/* ===================== EMPLOYEE DETAILS HEADING ===================== */
.details-heading-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 14px;
}

.payslip-no {
  font-size: 11px;
}

.section-heading {
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.3px;
  margin-bottom: 0;
}

/* ===================== EMPLOYEE DETAILS + NET PAYABLE ===================== */
.details-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 10px;
}

.employee-details {
  flex: 1;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;
  row-gap: 8px;
  font-size: 11.5px;
}

.detail-item {
  display: flex;
}

.detail-label {
  width: 110px;
  flex-shrink: 0;
  color: #1a1a1a;
}

.detail-colon {
  width: 12px;
  flex-shrink: 0;
}

.detail-value {
  flex: 1;
}

/* Net payable highlight box */
.net-payable-box {
  width: 160px;
  height: 90px;
  border: 1px solid #444444;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

.net-payable-box .amount-strip {
  width: 100%;
  background: var(--panel-bg);
  border-left: 5px solid var(--accent-purple-dark);
  padding: 14px 8px 8px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.net-payable-box .amount {
  font-size: 20px;
  font-weight: bold;
}

.net-payable-box .label {
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.3px;
  padding: 10px 6px;
}

/* ===================== ATTENDANCE SUMMARY ===================== */
.attendance-section {
  margin-top: 14px;
}

.attendance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  column-gap: 20px;
  row-gap: 8px;
  font-size: 11.5px;
  margin-top: 8px;
}

.attendance-item {
  display: flex;
}

.attendance-label {
  width: 100px;
  flex-shrink: 0;
}

.attendance-colon {
  width: 12px;
  flex-shrink: 0;
}

.attendance-value {
  font-weight: bold;
}

/* ===================== DASHED DIVIDER ===================== */
.dashed-divider {
  border-top: 1px dashed var(--dashed-grey);
  margin: 14px 0;
}

/* ===================== SALARY / DEDUCTIONS BOX ===================== */
.salary-box {
  border: 1px solid #444444;
  border-radius: 10px;
  padding: 16px 18px 12px 18px;
}

.salary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}

.salary-table thead th {
  text-align: left;
  font-weight: bold;
  font-size: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #444444;
}

.salary-table th.amount-col,
.salary-table td.amount-col {
  text-align: right;
  padding-right: 4px;
}

.salary-table td {
  padding: 7px 4px;
  vertical-align: top;
}

.salary-table td.label-col {
  width: 27%;
}

.salary-table td.amount-col {
  width: 20%;
}

.salary-table tfoot td {
  border-top: 1px dashed var(--dashed-grey);
  font-weight: bold;
  padding-top: 8px;
}

/* Loan Balance / Extra Bonus row */
.bonus-row {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 10px;
  font-size: 11.5px;
}

.bonus-row .col-title {
  font-weight: bold;
  margin-bottom: 6px;
}

.loan-col {
  width: 22%;
}

.bonus-col {
  flex: 1;
  display: flex;
  gap: 24px;
}

.bonus-col .bonus-item {
  white-space: nowrap;
}

/* ===================== TOTAL NET SALARY ===================== */
.net-salary-section {
  border: 1px solid #444444;
  border-radius: 6px;
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
}

.net-salary-left {
  padding: 12px 16px;
}

.net-salary-left .title {
  font-size: 13px;
  font-weight: bold;
}

.net-salary-left .subtitle {
  font-size: 10px;
  color: var(--text-grey);
  margin-top: 2px;
}

.net-salary-right {
  background: var(--panel-bg);
  height: 100%;
  padding: 18px 24px;
  font-size: 20px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===================== AMOUNT IN WORDS ===================== */
.amount-words {
  margin-top: 14px;
  font-size: 11px;
  letter-spacing: 0.2px;
}

/* ===================== CONFIDENTIALITY STATEMENT ===================== */
.confidential-note {
  margin-top: 14px;
  font-size: 10px;
  text-align: center;
  line-height: 1.5;
  color: #1a1a1a;
}

/* ===================== FOOTER ===================== */
.footer-line {
  border-top: 1px solid #444444;
  margin-top: 10px;
}

.footer-note {
  text-align: center;
  font-size: 9.5px;
  margin-top: 6px;
  color: #1a1a1a;
}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      ${logoHtml}
    </div>
    <div class="header-center">
      <h1>Payslip</h1>
    </div>
    <div class="header-right">
      <div>Payslip For the Month</div>
      <div class="month">${monthName} ${payslip.year}</div>
      <div class="range">(${firstDay} to ${lastDay})</div>
    </div>
  </header>

  <!-- EMPLOYEE DETAILS HEADING -->
  <div class="details-heading-row">
    <span class="section-heading">EMPLOYEE DETAILS</span>
    <span class="payslip-no">Payslip No&nbsp;&nbsp;: ${esc(payslipNo)}</span>
  </div>

  <!-- EMPLOYEE DETAILS + NET PAYABLE BOX -->
  <section class="details-row">
    <div class="employee-details">
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Employee name</span><span class="detail-colon">:</span>
          <span class="detail-value">${esc(employee.employeeName)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Employee Code</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.employeeCode)}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">Department</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.department)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Designation</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.designation)}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">Employment Type</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.employmentStatus)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Category</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.department)}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">PAN No</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.panNumber)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">DOJ</span><span class="detail-colon">:</span>
          <span class="detail-value">${employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : '\u2014'}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">Aadhar No.</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.aadharNumber)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">UAN</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.uanNumber)}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">Pay Mode</span><span class="detail-colon">:</span>
          <span class="detail-value">Bank Transfer</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">PF A/c No</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.pfNumber)}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">Bank Name</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.bankName)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Bank A/c No</span><span class="detail-colon">:</span>
          <span class="detail-value">${valOrDash(employee.bankAccountNumber)}</span>
        </div>
      </div>
    </div>

    <div class="net-payable-box">
      <div class="amount-strip">
        <span class="amount">${formatRupee(netSalary)}</span>
      </div>
      <div class="label">TOTAL NET PAYABLE</div>
    </div>
  </section>

  <!-- ATTENDANCE SUMMARY -->
  <section class="attendance-section">
    <div class="section-heading">ATTENDANCE SUMMARY</div>

    <div class="attendance-grid">
      <div class="attendance-item">
        <span class="attendance-label">Month Days</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.totalDays || totalDaysInMonth}</span>
      </div>
      <div class="attendance-item">
        <span class="attendance-label">Total Paid Days</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.payableDays || 0}</span>
      </div>
      <div class="attendance-item">
        <span class="attendance-label">Present Days</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.presentDays || 0}</span>
      </div>

      <div class="attendance-item">
        <span class="attendance-label">Weekly-Off</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.weekendDays || 0}</span>
      </div>
      <div class="attendance-item">
        <span class="attendance-label">Net Paid Days</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.payableDays || 0}</span>
      </div>
      <div class="attendance-item">
        <span class="attendance-label">Absent Days</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.absentDays || 0}</span>
      </div>

      <div class="attendance-item">
        <span class="attendance-label">Paid Holidays</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.holidayDays || 0}</span>
      </div>
      <div class="attendance-item">
        <span class="attendance-label">LOP</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.lopDays && payslip.lopDays > 0 ? payslip.lopDays : 'Nil'}</span>
      </div>
      <div class="attendance-item"></div>

      <div class="attendance-item">
        <span class="attendance-label">Working Days</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.workingDays || 0}</span>
      </div>
      <div class="attendance-item">
        <span class="attendance-label">Paid leave</span><span class="attendance-colon">:</span>
        <span class="attendance-value">${payslip.leaveDays || 0}</span>
      </div>
      <div class="attendance-item"></div>
    </div>
  </section>

  <!-- DASHED DIVIDER -->
  <div class="dashed-divider"></div>

  <!-- SALARY / DEDUCTIONS TABLE -->
  <section class="salary-box">
    <table class="salary-table">
      <thead>
        <tr>
          <th>Salary</th>
          <th class="amount-col">Amount Rs.</th>
          <th>Deductions</th>
          <th class="amount-col">Amount Rs.</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="label-col">Basic Salary</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.basicSalary)}</td>
          <td class="label-col">EPF Contribution</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.pfDeduction)}</td>
        </tr>
        <tr>
          <td class="label-col">HRA</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.hra)}</td>
          <td class="label-col">Professional Tax</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.professionalTax)}</td>
        </tr>
        <tr>
          <td class="label-col">Special Allowance</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.specialAllowance)}</td>
          <td class="label-col">ESI</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.esiDeduction)}</td>
        </tr>
        <tr>
          <td class="label-col">Conveyance Allowance</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.travelAllowance)}</td>
          <td class="label-col">TDS</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.incomeTax)}</td>
        </tr>
        <tr>
          <td class="label-col">Performance Allowance</td>
          <td class="amount-col">${formatRupeeOrNil((payslip.medicalAllowance || 0) + (payslip.otherAllowances || 0))}</td>
          <td class="label-col">Advance recovery<br>/loan recovery</td>
          <td class="amount-col">${formatRupeeOrNil(payslip.advanceDeduction)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="label-col">Total Salary</td>
          <td class="amount-col">${formatRupee(totalEarnings)}</td>
          <td class="label-col">Total Deductions</td>
          <td class="amount-col">${formatRupee(totalDeductions)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="bonus-row">
      <div class="loan-col">
        <div class="col-title">Loan Balance</div>
        <div>Total&nbsp;&nbsp;: Nil</div>
      </div>
      <div class="bonus-col">
        <div>
          <div class="col-title">Extra Bonus</div>
        </div>
        <div class="bonus-item">Project Delivery Incentive&nbsp;&nbsp;: ${formatRupeeOrNil(payslip.bonus)}</div>
        <div class="bonus-item">Full Attendance Incentive&nbsp;&nbsp;: ${formatRupeeOrNil(payslip.incentive)}</div>
      </div>
    </div>
  </section>

  <!-- TOTAL NET SALARY -->
  <section class="net-salary-section">
    <div class="net-salary-left">
      <div class="title">TOTAL NET SALARY</div>
      <div class="subtitle">Gross Salary - Total Deductions</div>
    </div>
    <div class="net-salary-right">${formatRupee(netSalary)}</div>
  </section>

  <!-- AMOUNT IN WORDS -->
  <div class="amount-words">AMOUNT IN WORDS&nbsp;: ${esc(amountInWords)}</div>

  <!-- CONFIDENTIALITY STATEMENT -->
  <div class="confidential-note">
    This payslip is confidential and intended solely for the employee named above. Unauthorized sharing,
    modification, or misuse may be subject to Company policy.
  </div>

  <!-- FOOTER -->
  <div class="footer-line"></div>
  <div class="footer-note">
    -This document has been automatically generated by Payroll: therefore, a signature not required.-
  </div>

</div>
</body>
</html>`;
}

export class PdfService {
  static async generatePayslip(payslipId: string): Promise<{ filePath: string; fileSize: number }> {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { employee: true },
    });

    if (!payslip) {
      throw new Error('Payslip not found');
    }

    const companyProfile = await prisma.companyProfile.findFirst();
    const employee = payslip.employee;

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const safeName = employee.employeeName.replace(/[^a-zA-Z0-9]/g, '');
    const monthName = MONTHS[payslip.month - 1];
    const fileName = `${safeName}_${monthName}_${payslip.year}.pdf`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const htmlContent = buildPayslipHtml(payslip, employee, companyProfile);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load' });

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      await page.close();

      const stats = fs.statSync(filePath);
      logger.info(`PDF generated: ${filePath} (${stats.size} bytes)`);
      return { filePath, fileSize: stats.size };
    } finally {
      await browser.close();
    }
  }
}
