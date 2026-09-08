import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { convertToWords as salaryToWords } from '../utils/salary-calculator';

const OUTPUT_DIR = path.join(__dirname, '../../uploads/payslips/');

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

function fmtAmt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function fmtOrNil(n: number): string {
  return n > 0 ? fmtAmt(n) : 'Nil';
}

function fmtPlain(n: number): string {
  return String(Math.round(n || 0));
}

function fmtPlainOrNil(n: number): string {
  return n > 0 ? fmtPlain(n) : 'Nil';
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

function resolveLogo(companyProfile: any): string {
  if (companyProfile?.logo) {
    const lp = path.resolve(companyProfile.logo);
    if (fs.existsSync(lp)) return logoToDataUri(lp);
  }

  const root = path.resolve(__dirname, '../../..');
  const candidates = [
    path.join(root, 'frontend/public/logo_pdf.PNG'),
    path.join(root, 'frontend/public/logo.png'),
    path.join(root, 'public/logo_pdf.PNG'),
    path.join(root, 'public/logo.png'),
  ];
  for (const fb of candidates) {
    if (fs.existsSync(fb)) return logoToDataUri(fb);
  }
  return '';
}

function buildPayslipHtml(payslip: any, employee: any, companyProfile: any): string {
  const monthShort = MONTHS_SHORT[payslip.month - 1];
  const totalDaysInMonth = new Date(payslip.year, payslip.month, 0).getDate();
  const firstDay = `1 ${monthShort}`;
  const lastDay = `${totalDaysInMonth} ${monthShort}`;
  const monthLabel = `${monthShort} ${payslip.year}`;
  const payslipNo = `PAY-${payslip.year}-${String(payslip.month).padStart(2, '0')}-${employee.employeeCode || '0001'}`;

  const logoSrc = resolveLogo(companyProfile);

  const earnings = payslip.totalEarnings || payslip.grossSalary || 0;
  const deductions = payslip.totalDeductions || 0;
  const netSalary = payslip.netSalary || 0;
  const amountInWords = payslip.amountInWords || salaryToWords(Math.round(netSalary));

  const category = employee.category || '\u2014';
  const dojFormatted = employee.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '\u2014';

  const salaryRows = [
    { label: 'Basic Salary', amount: payslip.basicSalary },
    { label: 'HRA', amount: payslip.hra },
    { label: 'Special Allowance', amount: payslip.specialAllowance },
    { label: 'Conveyance Allowance', amount: payslip.travelAllowance },
    { label: 'Performance Allowance', amount: (payslip.medicalAllowance || 0) + (payslip.otherAllowances || 0) + (payslip.da || 0) },
  ];

  const deductionRows = [
    { label: 'EPF Contribution', amount: payslip.pfDeduction },
    { label: 'Professional Tax', amount: payslip.professionalTax },
    { label: 'ESI', amount: payslip.esiDeduction },
    { label: 'TDS', amount: payslip.incomeTax },
    { label: 'Advance recovery<br>/loan recovery', amount: payslip.advanceDeduction },
  ];

  const maxRows = Math.max(salaryRows.length, deductionRows.length);

  let tableRows = '';
  for (let i = 0; i < maxRows; i++) {
    const s = salaryRows[i];
    const d = deductionRows[i];
    const last = i === maxRows - 1;
    tableRows += `<div class="salary-row"${last ? ' style="min-height:10.5mm;"' : ''}>
      <div class="salary-cell">${s ? s.label : ''}</div>
      <div class="salary-cell amount">${s ? fmtPlainOrNil(s.amount) : ''}</div>
      <div class="salary-cell deduction">${d ? d.label : ''}</div>
      <div class="salary-cell amount">${d ? fmtPlainOrNil(d.amount) : ''}</div>
    </div>`;
  }

  const loanBalance = payslip.advanceDeduction && payslip.advanceDeduction > 0
    ? fmtPlain(payslip.advanceDeduction)
    : 'Nil';

  const projectIncentive = payslip.bonus && payslip.bonus > 0 ? fmtPlain(payslip.bonus) : 'Nil';
  const attendanceIncentive = payslip.incentive && payslip.incentive > 0 ? fmtPlain(payslip.incentive) : 'Nil';

  const companyName = companyProfile?.companyName || '';

  const monthUpper = `${monthShort} ${payslip.year}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(companyName)} - Payslip</title>
<style>
    * {
        box-sizing: border-box;
    }

    @page {
        size: A4;
        margin: 0;
    }

    body {
        margin: 0;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        color: #171717;
        font-weight: 500;
    }

    .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 8.8mm 9.5mm 6.5mm;
        background: #fff;
        position: relative;
        overflow: hidden;
    }

    /* HEADER */
    .header {
        height: 34mm;
        display: grid;
        grid-template-columns: 36% 28% 36%;
        align-items: start;
        border-bottom: 1px solid #a8a8a8;
        padding-bottom: 3.5mm;
    }

    .logo-area {
        padding-left: 1.5mm;
    }

    .logo {
        width: 56mm;
        height: auto;
        max-height: 25mm;
        object-fit: contain;
        object-position: left center;
        display: block;
    }

    .title {
        text-align: center;
        font-size: 21px;
        font-weight: 700;
        padding-top: 5.2mm;
    }

    .month-area {
        text-align: right;
        padding-top: 1.8mm;
        padding-right: 2mm;
        line-height: 1.22;
    }

    .month-title {
        font-size: 17px;
        font-weight: 400;
    }

    .month {
        font-size: 22px;
        font-weight: 700;
        margin-top: 1.2mm;
    }

    .date {
        font-size: 15px;
        margin-top: 1mm;
    }

    /* EMPLOYEE SECTION */
    .employee-section {
        position: relative;
        margin-top: 3.4mm;
        padding-right: 52mm;
    }

    .section-heading {
        font-size: 13px;
        font-weight: 700;
        margin: 0 0 3.5mm 1.5mm;
    }

    .payslip-no {
        position: absolute;
        right: 3mm;
        top: 0;
        font-size: 13px;
        white-space: nowrap;
    }

    .employee-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        column-gap: 6mm;
        row-gap: 3.6mm;
        padding-left: 1.5mm;
        padding-right: 0;
        width: 100%;
    }

    .employee-column {
        display: grid;
        align-items: baseline;
        min-width: 0;
    }

    .employee-column:nth-child(odd) {
        grid-template-columns: 31mm 5mm minmax(0, 1fr);
    }

    .employee-column:nth-child(even) {
        grid-template-columns: 24mm 5mm minmax(0, 1fr);
    }

    .employee-label {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
    }

    .colon {
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        display: block;
        visibility: visible;
    }

    .employee-value {
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
        min-width: 0;
    }

    /* NET PAYABLE BOX */
    .payable-box {
        position: absolute;
        right: 0;
        top: 13mm;
        width: 47.5mm;
        height: 32mm;
        border: 1px solid #6e6e6e;
        border-radius: 3.5mm;
        overflow: hidden;
        background: #fff;
    }

    .payable-top {
        height: 16mm;
        background: #b7bacb;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .payable-top::before {
        content: "";
        position: absolute;
        left: 4mm;
        top: 3mm;
        bottom: 3mm;
        width: 1.3mm;
        background: #656887;
    }

    .payable-amount {
        font-size: 22px;
        font-weight: 700;
        margin-left: 2mm;
    }

    .payable-label {
        height: 16mm;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 700;
    }

    /* ATTENDANCE */
    .attendance {
        margin-top: 3mm;
        padding-left: 1.5mm;
    }

    .attendance-grid {
        display: grid;
        grid-template-columns: repeat(3, 50mm);
        column-gap: 0;
        row-gap: 3.5mm;
        width: 150mm;
    }

    .attendance-column {
        display: grid;
        grid-template-columns: 29mm 3mm 1fr;
        align-items: baseline;
    }

    .attendance-label,
    .attendance-value,
    .attendance-colon {
        font-size: 14px;
        font-weight: 600;
    }

    .attendance-value {
        font-weight: 700;
    }

    .divider {
        margin-top: 4mm;
        border-top: 1px dashed #777;
    }

    /* SALARY TABLE */
    .salary-box {
        margin-top: 4mm;
        border: 1px solid #6c6c6c;
        border-radius: 3.5mm;
        overflow: hidden;
    }

    .salary-header,
    .salary-row,
    .salary-total {
        display: grid;
        grid-template-columns: 31% 19% 31% 19%;
        align-items: center;
    }

    .salary-header {
        min-height: 12mm;
        border-bottom: 1px solid #a0a0a0;
        font-weight: 700;
        font-size: 15px;
    }

    .salary-row {
        min-height: 8.1mm;
        font-size: 14px;
        font-weight: 500;
    }

    .salary-total {
        min-height: 10mm;
        border-top: 1px dashed #777;
        font-size: 14px;
        font-weight: 700;
    }

    .salary-cell {
        padding: 0 3.5mm;
    }

    .amount {
        text-align: right;
        padding-right: 5mm;
    }

    .deduction {
        padding-left: 5mm;
    }

    /* BONUS */
    .bonus-section {
        display: grid;
        grid-template-columns: 28% 72%;
        margin-top: 4mm;
        padding: 0 3.5mm;
    }

    .bonus-heading {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 3mm;
    }

    .bonus-item {
        font-size: 14px;
        font-weight: 700;
        margin-top: 3mm;
    }

    .bonus-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 12mm;
    }

    .bonus-line {
        display: grid;
        grid-template-columns: auto 4mm auto;
        align-items: baseline;
        white-space: nowrap;
        font-weight: 700;
    }

    /* TOTAL NET SALARY */
    .net-salary {
        margin-top: 6.5mm;
        height: 16mm;
        border: 1px solid #6c6c6c;
        border-radius: 3mm;
        display: grid;
        grid-template-columns: 1fr 47.5mm;
        overflow: hidden;
    }

    .net-info {
        padding: 2.7mm 4mm;
    }

    .net-title {
        font-size: 16px;
        font-weight: 700;
    }

    .net-subtitle {
        font-size: 14px;
        margin-top: 1.2mm;
    }

    .net-amount {
        background: #b7bacb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 700;
    }

    /* FOOTER */
    .words {
        margin: 5.5mm 2mm 0;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
    }

    .confidential {
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.35;
        margin-top: 4.5mm;
    }

    .footer-line {
        border-top: 1px solid #999;
        margin-top: 3mm;
    }

    .generated {
        text-align: center;
        font-size: 12.5px;
        font-weight: 500;
        margin-top: 2.8mm;
    }

    .generated strong {
        font-weight: 700;
    }

    @media print {
        body {
            background: #fff;
        }

        .page {
            margin: 0;
            box-shadow: none;
        }
    }
</style>
</head>

<body>
<div class="page">

    <header class="header">
        <div class="logo-area">
            ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="${esc(companyName)}">` : ''}
        </div>

        <div class="title">Payslip</div>

        <div class="month-area">
            <div class="month-title">Payslip For the Month</div>
            <div class="month">${esc(monthUpper)}</div>
            <div class="date">(${esc(firstDay)} to ${esc(lastDay)})</div>
        </div>
    </header>

    <section class="employee-section">
        <h2 class="section-heading">EMPLOYEE DETAILS</h2>

        <div class="payslip-no">
            Payslip No&nbsp;&nbsp;&nbsp; : &nbsp;${esc(payslipNo)}
        </div>

        <div class="employee-grid">

            <div class="employee-column">
                <span class="employee-label">Employee name</span><span class="colon">:</span><span class="employee-value">${esc(employee.employeeName)}</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">Employee Code</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.employeeCode)}</span>
            </div>

            <div class="employee-column">
                <span class="employee-label">Department</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.department)}</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">Designation</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.designation)}</span>
            </div>

            <div class="employee-column">
                <span class="employee-label">Employment Type</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.employmentStatus)}</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">Category</span><span class="colon">:</span><span class="employee-value">${esc(category)}</span>
            </div>

            <div class="employee-column">
                <span class="employee-label">PAN No</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.panNumber)}</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">DOJ</span><span class="colon">:</span><span class="employee-value">${dojFormatted}</span>
            </div>

            <div class="employee-column">
                <span class="employee-label">Aadhar No.</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.aadharNumber)}</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">UAN</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.uanNumber)}</span>
            </div>

            <div class="employee-column">
                <span class="employee-label">Pay Mode</span><span class="colon">:</span><span class="employee-value">Online Payment</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">PF A/c No</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.pfNumber)}</span>
            </div>

            <div class="employee-column">
                <span class="employee-label">Bank Name</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.bankName)}</span>
            </div>
            <div class="employee-column">
                <span class="employee-label">Bank A/c No</span><span class="colon">:</span><span class="employee-value">${valOrDash(employee.bankAccountNumber)}</span>
            </div>

        </div>

        <div class="payable-box">
            <div class="payable-top">
                <div class="payable-amount">${formatRupee(netSalary)}</div>
            </div>
            <div class="payable-label">TOTAL NET PAYABLE</div>
        </div>
    </section>

    <section class="attendance">
        <h2 class="section-heading">ATTENDANCE SUMMARY</h2>

        <div class="attendance-grid">

            <div class="attendance-column">
                <span class="attendance-label">Month Days</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.totalDays || totalDaysInMonth}</span>
            </div>
            <div class="attendance-column">
                <span class="attendance-label">Total Paid Days</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.payableDays || 0}</span>
            </div>
            <div class="attendance-column">
                <span class="attendance-label">Present Days</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.presentDays || 0}</span>
            </div>

            <div class="attendance-column">
                <span class="attendance-label">Weekly-Off</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.weekendDays || 0}</span>
            </div>
            <div class="attendance-column">
                <span class="attendance-label">Net Paid Days</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.payableDays || 0}</span>
            </div>
            <div class="attendance-column">
                <span class="attendance-label">Absent Days</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.absentDays || 0}</span>
            </div>

            <div class="attendance-column">
                <span class="attendance-label">Paid Holidays</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.holidayDays || 0}</span>
            </div>
            <div class="attendance-column">
                <span class="attendance-label">LOP</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.lopDays && payslip.lopDays > 0 ? payslip.lopDays : 'Nil'}</span>
            </div>
            <div></div>

            <div class="attendance-column">
                <span class="attendance-label">Working Days</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.workingDays || 0}</span>
            </div>
            <div class="attendance-column">
                <span class="attendance-label">Paid leave</span><span class="attendance-colon">:</span><span class="attendance-value">${payslip.leaveDays || 0}</span>
            </div>
            <div></div>

        </div>

        <div class="divider"></div>
    </section>

    <section class="salary-box">

        <div class="salary-header">
            <div class="salary-cell">Salary</div>
            <div class="salary-cell amount">Amount Rs.</div>
            <div class="salary-cell deduction">Deductions</div>
            <div class="salary-cell amount">Amount Rs.</div>
        </div>

        ${tableRows}

        <div class="salary-total">
            <div class="salary-cell">Total Salary</div>
            <div class="salary-cell amount">${fmtPlain(earnings)}</div>
            <div class="salary-cell deduction">Total Deductions</div>
            <div class="salary-cell amount">${fmtPlain(deductions)}</div>
        </div>

    </section>

    <section class="bonus-section">

        <div>
            <div class="bonus-heading">Loan Balance</div>
            <div class="bonus-item"><strong>Total</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp;${esc(loanBalance)}</div>
        </div>

        <div>
            <div class="bonus-heading">Extra Bonus</div>
            <div class="bonus-grid">
                <div class="bonus-line">
                    <span>Project Delivery Incentive</span><span>:</span><span>${projectIncentive}</span>
                </div>
                <div class="bonus-line">
                    <span>Full Attendance Incentive</span><span>:</span><span>${attendanceIncentive}</span>
                </div>
            </div>
        </div>

    </section>

    <section class="net-salary">
        <div class="net-info">
            <div class="net-title">TOTAL NET SALARY</div>
            <div class="net-subtitle">Gross Salary - Total Deductions</div>
        </div>
        <div class="net-amount">${formatRupee(netSalary)}</div>
    </section>

    <div class="words">
        AMOUNT IN WORDS : ${esc(amountInWords)}
    </div>

    <div class="confidential">
        This payslip is confidential and intended solely for the employee named above. Unauthorized sharing,<br>
        modification, or misuse may be subject to Company policy.
    </div>

    <div class="footer-line"></div>

    <div class="generated">
        -This document has been automatically generated by
        <strong>${esc(companyName)}</strong> Payroll: therefore, a signature not required.-
    </div>

</div>
</body>
</html>`;
}

const JIBBLE_OUTPUT_DIR = path.join(__dirname, '../../uploads/jibble-payslips/');

export class PdfService {
  static async generatePayslipFromData(
    payslip: any,
    employee: any,
    companyProfile: any,
    outputDir: string = JIBBLE_OUTPUT_DIR
  ): Promise<{ filePath: string; fileSize: number }> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const safeName = employee.employeeName.replace(/[^a-zA-Z0-9]/g, '');
    const monthName = MONTHS_SHORT[payslip.month - 1];
    const fileName = `${safeName}_${monthName}_${payslip.year}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const htmlContent = buildPayslipHtml(payslip, employee, companyProfile);

    const { default: puppeteer } = await import('puppeteer');
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
      logger.info(`Jibble payslip PDF generated: ${filePath} (${stats.size} bytes)`);
      return { filePath, fileSize: stats.size };
    } finally {
      await browser.close();
    }
  }

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
    const monthName = MONTHS_SHORT[payslip.month - 1];
    const fileName = `${safeName}_${monthName}_${payslip.year}.pdf`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const htmlContent = buildPayslipHtml(payslip, employee, companyProfile);

    const { default: puppeteer } = await import('puppeteer');
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
