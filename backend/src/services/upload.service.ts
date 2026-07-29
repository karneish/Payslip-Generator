import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import csvParser from 'csv-parser';
import { prisma } from '../config/database';
import { AppError } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { getMonthName } from '../utils/date-utils';
import { EmployeeService } from './employee.service';
import { calculateWorkingDays, calculateGrossSalary, calculatePFDeduction, calculateESIDeduction, calculateProfessionalTax, roundOffAmount, convertToWords } from '../utils/salary-calculator';

export class UploadService {
  private static MONTH_MAP: Record<string, number> = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
    'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
    'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
  };

  private static parseMonthYearFromSheetName(name: string): { month: number; year: number } | null {
    const cleaned = name.trim();
    const yearMatch = cleaned.match(/20\d{2}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 0;
    for (const [abbr, num] of Object.entries(this.MONTH_MAP)) {
      if (new RegExp(abbr, 'i').test(cleaned)) {
        if (year) return { month: num, year };
      }
    }
    if (year) return { month: 0, year };
    return null;
  }

  private static detectMonthYearFromFileName(fileName: string): { month: number; year: number } | null {
    const baseName = path.parse(fileName).name;
    const detected = this.parseMonthYearFromSheetName(baseName);
    if (detected && detected.month) return detected;
    const yearMatch = baseName.match(/20\d{2}/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      const withoutYear = baseName.replace(/20\d{2}/g, '');
      for (const [abbr, num] of Object.entries(this.MONTH_MAP)) {
        if (new RegExp(abbr, 'i').test(withoutYear)) {
          return { month: num, year };
        }
      }
      return { month: 0, year };
    }
    for (const [abbr, num] of Object.entries(this.MONTH_MAP)) {
      if (new RegExp(abbr, 'i').test(baseName)) {
        return { month: num, year: 0 };
      }
    }
    return null;
  }

  static async uploadFile(file: Express.Multer.File, month: number, year: number, adminId: string) {
    const ext = path.extname(file.originalname).toLowerCase();
    let rows: any[] = [];

    const detected = this.detectMonthYearFromFileName(file.originalname);
    const effectiveMonth = (detected?.month && detected.month >= 1 && detected.month <= 12) ? detected.month : month;
    const effectiveYear = (detected?.year && detected.year >= 2000) ? detected.year : year;

    if (ext === '.csv') {
      rows = await this.parseCSV(file.path);
    } else if (ext === '.xlsx' || ext === '.xls') {
      rows = this.parseExcel(file.path, effectiveMonth, effectiveYear);
    } else {
      throw new AppError('Unsupported file format. Please upload CSV or Excel files.', 400);
    }

    if (rows.length === 0) {
      throw new AppError('No data found in the uploaded file for the selected month and year', 400);
    }

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: ext,
        recordCount: rows.length,
        status: 'PARSED',
        month: effectiveMonth,
        year: effectiveYear,
        uploadedBy: adminId
      }
    });

    const extractName = (r: any): string => r['Employee Name'] || r['employeeName'] || r['name'] || r['Name'] || '';
    const uniqueNames = [...new Set(rows.map(extractName).filter((n): n is string => !!n))];
    const nameToEmployeeId: Record<string, string> = {};
    for (const name of uniqueNames) {
      const salaryData = rows.find(r => extractName(r) === name);
      const employee = await EmployeeService.findOrCreateFromUpload(name, salaryData || {}, adminId);
      nameToEmployeeId[name] = employee.id;
    }

    const parsedRecords = rows.map((row) => {
      const employeeName = extractName(row) || 'Unknown';
      const recordMonth = row._month || effectiveMonth;
      const recordYear = row._year || effectiveYear;
      const presentDays = this.parseNumber(row['Present']);
      const absentDays = this.parseNumber(row['Absent']);
      const holidayDays = this.parseNumber(row['Holiday']);
      const monthlySalary = this.parseNumber(row['Monthly Salary']);
      const attBonus = this.parseNumber(row['Att. Bonus']);
      const incentive = this.parseNumber(row['Incentive']);
      const bonus = this.parseNumber(row['Bonus']);
      const advance = this.parseNumber(row['Advance']);
      const gross = this.parseNumber(row['Gross']);
      const netSalary = this.parseNumber(row['Net Salary']);
      return {
        uploadedFileId: uploadedFile.id,
        employeeId: nameToEmployeeId[employeeName] || null,
        employeeName,
        month: recordMonth,
        year: recordYear,
        presentDays,
        absentDays,
        holidayDays,
        monthlySalary,
        attBonus,
        incentive,
        bonus,
        gross,
        netSalary,
        basicSalary: monthlySalary,
        hra: 0,
        da: 0,
        leaveDeduction: 0,
        pfDeduction: 0,
        professionalTax: 0,
        esiDeduction: 0,
        otherDeductions: advance,
        workingDays: presentDays,
        leaves: holidayDays,
        lop: absentDays,
        status: 'PENDING',
        isValid: true
      };
    });

    await prisma.parsedSalaryData.createMany({
      data: parsedRecords
    });

    const preview = await prisma.parsedSalaryData.findMany({
      where: { uploadedFileId: uploadedFile.id },
      orderBy: { employeeName: 'asc' }
    });

    logger.info(`File uploaded and parsed: ${file.originalname} (${rows.length} records) for ${getMonthName(effectiveMonth)} ${effectiveYear}`);

    return {
      upload: uploadedFile,
      preview,
      totalRecords: rows.length
    };
  }

  private static async parseCSV(filePath: string): Promise<any[]> {
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split(/\r?\n/).filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      const nonCommaChars = trimmed.replace(/,/g, '').length;
      return nonCommaChars > 0;
    });

    const isAttendanceFormat = lines.some(line =>
      line.includes('Monthly Salary') || line.includes('Net Salary')
    );

    if (isAttendanceFormat) {
      return this.parseAttendanceSheetFromLines(lines);
    }

    return this.parseStandardCSV(filePath);
  }

  private static parseExcel(filePath: string, filterMonth?: number, filterYear?: number): any[] {
    const workbook = XLSX.readFile(filePath);
    const allRecords: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rawRows.length === 0) continue;

      const hasAttendanceLabels = rawRows.some(row =>
        row.some(cell => {
          const s = String(cell).trim();
          return s === 'Monthly Salary' || s === 'Net Salary';
        })
      );

      if (hasAttendanceLabels) {
        const sheetMY = this.parseMonthYearFromSheetName(sheetName);
        allRecords.push(...this.parseMonthlyAttendanceSheet(rawRows, sheetName, sheetMY?.month ?? filterMonth, sheetMY?.year ?? filterYear));
      } else {
        const std = XLSX.utils.sheet_to_json(sheet) as any[];
        const hasSalaryCols = std.length > 0 && std.some((row: any) => {
          const keys = Object.keys(row).map(k => k.toLowerCase());
          return keys.some(k => k.includes('salary') || k.includes('basic') || k.includes('hra'));
        });
        if (hasSalaryCols) {
          allRecords.push(...std.filter((row: any) => {
            const vals = Object.values(row);
            return vals.some(v => v !== null && v !== undefined && v !== '');
          }));
        }
      }
    }

    if (filterMonth != null && filterMonth > 0 && filterYear != null && filterYear > 0) {
      return allRecords.filter(row => {
        const rm = row._month || filterMonth;
        const ry = row._year || filterYear;
        return rm === filterMonth && ry === filterYear;
      });
    }

    return allRecords;
  }

  private static parseMonthlyAttendanceSheet(rawRows: any[][], sheetName?: string, fallbackMonth?: number, fallbackYear?: number): any[] {
    const records: any[] = [];
    const headerRows: number[] = [];

    const sheetMY = sheetName ? this.parseMonthYearFromSheetName(sheetName) : null;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const hasLabels = row.some(cell => {
        const s = String(cell).trim();
        return s === 'Monthly Salary' || s === 'Net Salary';
      });
      if (hasLabels) headerRows.push(i);
    }

    for (const hi of headerRows) {
      const headerRow = rawRows[hi];
      const dataRowIdx = hi + 1;
      if (dataRowIdx >= rawRows.length) continue;
      const dataRow = rawRows[dataRowIdx];

      const name = String(headerRow[0] ?? '').trim();
      if (!name) continue;

      const labelMap: Record<string, number> = {};
      for (let c = 0; c < headerRow.length; c++) {
        const s = String(headerRow[c] ?? '').trim();
        if (s) labelMap[s] = c;
      }

      const colIdx = (label: string): number => {
        const idx = labelMap[label];
        return idx !== undefined ? idx : -1;
      };
      const getDataVal = (label: string): any => {
        const idx = colIdx(label);
        if (idx < 0 || idx >= dataRow.length) return 0;
        return dataRow[idx];
      };

      const monthlySalary = this.parseNumber(getDataVal('Monthly Salary'));
      const attBonus = this.parseNumber(getDataVal('Att. Bonus'));
      const incentive = this.parseNumber(getDataVal('Incentive'));
      const bonus = this.parseNumber(getDataVal('Bonus'));
      const advance = this.parseNumber(getDataVal('Advance'));
      const presentDays = this.parseNumber(getDataVal('Present'));
      const absentDays = this.parseNumber(getDataVal('Absent'));
      const holidayDays = this.parseNumber(getDataVal('Holiday'));
      const netSalary = this.parseNumber(getDataVal('Net Salary'));
      const gross = this.parseNumber(getDataVal('Gross'));

      const totalDayCols = headerRow.reduce((max, cell) => {
        const n = Number(cell);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);

      let pCount = 0, aCount = 0, hCount = 0, plCount = 0;
      for (let c = 1; c <= totalDayCols && c < dataRow.length; c++) {
        const mark = String(dataRow[c] ?? '').trim().toUpperCase();
        if (mark === 'P') pCount++;
        else if (mark === 'A') aCount++;
        else if (mark === 'H') hCount++;
        else if (mark === 'PL') { plCount++; pCount++; }
      }

      const otherDeductions = this.parseNumber(getDataVal('Other Deductions'));

      records.push({
        'Employee Name': name,
        'Present': presentDays || pCount,
        'Absent': absentDays || aCount,
        'Holiday': holidayDays || hCount,
        'Monthly Salary': monthlySalary,
        'Att. Bonus': attBonus,
        'Incentive': incentive,
        'Bonus': bonus,
        'Advance': advance,
        'Gross': gross,
        'Net Salary': netSalary,
        '_hasNetSalary': 'Net Salary' in labelMap,
        '_hasGross': 'Gross' in labelMap,
        '_month': sheetMY?.month || fallbackMonth || new Date().getMonth() + 1,
        '_year': sheetMY?.year || fallbackYear || new Date().getFullYear()
      });
    }

    return records;
  }

  private static parseAttendanceSheetFromLines(lines: string[]): any[] {
    const records: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);

      const hasHeaders = values.some(v =>
        v.trim() === 'Monthly Salary' || v.trim() === 'Net Salary'
      );

      if (!hasHeaders) continue;

      const headerMap: Record<string, number> = {};
      values.forEach((v, idx) => {
        const key = v.trim();
        if (key) headerMap[key] = idx;
      });

      let dataValues: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const trimmed = lines[j].trim();
        if (!trimmed) continue;
        const parts = this.parseCSVLine(lines[j]);
        const nonEmpty = parts.filter(v => v.trim() !== '');
        if (nonEmpty.length > 1) {
          dataValues = parts;
          break;
        }
      }
      if (dataValues.length === 0) continue;

      const getVal = (key: string): string => {
        const idx = headerMap[key];
        if (idx === undefined || idx >= dataValues.length) return '0';
        const v = dataValues[idx]?.trim();
        return v || '0';
      };

      const name = values[0]?.trim() || 'Unknown';
      if (!name || name === 'Unknown') continue;

      const monthlySalary = this.parseNumber(getVal('Monthly Salary'));
      const attBonus = this.parseNumber(getVal('Att. Bonus'));
      const incentive = this.parseNumber(getVal('Incentive'));
      const bonus = this.parseNumber(getVal('Bonus'));
      const advance = this.parseNumber(getVal('Advance'));
      const presentDays = this.parseNumber(getVal('Present'));
      const absentDays = this.parseNumber(getVal('Absent'));
      const holidayDays = this.parseNumber(getVal('Holiday'));
      const netSalary = this.parseNumber(getVal('Net Salary'));
      const gross = this.parseNumber(getVal('Gross'));
      const otherDeductions = this.parseNumber(getVal('Other Deductions'));

      records.push({
        'Employee Name': name,
        'Present': presentDays,
        'Absent': absentDays,
        'Holiday': holidayDays,
        'Monthly Salary': monthlySalary,
        'Att. Bonus': attBonus,
        'Incentive': incentive,
        'Bonus': bonus,
        'Advance': advance,
        'Gross': gross,
        'Net Salary': netSalary,
        '_hasNetSalary': 'Net Salary' in headerMap,
        '_hasGross': 'Gross' in headerMap
      });
    }

    return records;
  }

  private static parseStandardCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = fs.createReadStream(filePath).pipe(csvParser());

      stream.on('data', (row: any) => {
        const hasAnyData = Object.values(row).some(v => v !== null && v !== undefined && v !== '');
        if (hasAnyData) {
          results.push(row);
        }
      });

      stream.on('end', () => resolve(results));
      stream.on('error', (err) => reject(err));
    });
  }

  private static parseStandardExcel(sheet: XLSX.WorkSheet): any[] {
    return XLSX.utils.sheet_to_json(sheet);
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  }

  private static parseNumber(value: any): number {
    if (typeof value === 'number') return Math.round(value);
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₹,]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.round(parsed);
    }
    return 0;
  }

  static async getUploads(filters: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const [uploads, total] = await Promise.all([
      prisma.uploadedFile.findMany({
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' }
      }),
      prisma.uploadedFile.count()
    ]);

    return {
      uploads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getUploadById(id: string) {
    const upload = await prisma.uploadedFile.findUnique({
      where: { id },
      include: { parsedData: { orderBy: { employeeName: 'asc' } } }
    });

    if (!upload) {
      throw new AppError('Upload not found', 404);
    }

    return upload;
  }

  static async saveParsedData(uploadId: string, data: any[], adminId: string) {
    const upload = await prisma.uploadedFile.findUnique({ where: { id: uploadId } });
    if (!upload) {
      throw new AppError('Upload not found', 404);
    }

    const uploadMonth = (upload.month && upload.month >= 1 && upload.month <= 12) ? upload.month : new Date().getMonth() + 1;
    const uploadYear = (upload.year && upload.year >= 2000) ? upload.year : new Date().getFullYear();

    const norm = (item: any, ...keys: string[]): any => {
      for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') return item[key];
      }
      return undefined;
    };

    const extractName = (item: any): string => {
      const name = norm(item, 'employeeName', 'Employee Name', 'name', 'Name');
      return (typeof name === 'string' ? name.trim() : '') || '';
    };

    const uniqueNames = [...new Set(
      data.map(extractName).filter((n): n is string => !!n)
    )];

    const nameToEmployeeId: Record<string, string> = {};
    for (const name of uniqueNames) {
      const salaryData = data.find(item => extractName(item) === name);
      const employee = await EmployeeService.findOrCreateFromUpload(name, salaryData || {}, adminId);
      nameToEmployeeId[name] = employee.id;
    }

    const parsedDataRecords = data.map((item) => {
      const employeeName = extractName(item) || 'Unknown';
      const rawMonth = Number(norm(item, 'month', '_month'));
      const rawYear = Number(norm(item, 'year', '_year'));
      const recordMonth = (rawMonth >= 1 && rawMonth <= 12) ? rawMonth : uploadMonth;
      const recordYear = (rawYear >= 2000 && rawYear <= 2100) ? rawYear : uploadYear;
      const presentDays = this.parseNumber(norm(item, 'presentDays', 'Present'));
      const absentDays = this.parseNumber(norm(item, 'absentDays', 'Absent'));
      const holidayDays = this.parseNumber(norm(item, 'holidayDays', 'Holiday'));
      const monthlySalary = this.parseNumber(norm(item, 'monthlySalary', 'Monthly Salary'));
      const attBonus = this.parseNumber(norm(item, 'attBonus', 'Att. Bonus'));
      const incentive = this.parseNumber(norm(item, 'incentive', 'Incentive'));
      const bonus = this.parseNumber(norm(item, 'bonus', 'Bonus'));
      const advance = this.parseNumber(norm(item, 'advance', 'Advance', 'otherDeductions'));
      const gross = this.parseNumber(norm(item, 'gross', 'Gross'));
      const netSalary = this.parseNumber(norm(item, 'netSalary', 'Net Salary'));

      const hasNetSalary = item._hasNetSalary === true
        || (typeof item.netSalary === 'number' && item.netSalary > 0)
        || (typeof item['Net Salary'] === 'number' && item['Net Salary'] > 0)
        || (typeof item.netSalary === 'string' && parseFloat(item.netSalary) > 0)
        || (typeof item['Net Salary'] === 'string' && parseFloat(item['Net Salary']) > 0);
      const hasGross = item._hasGross === true
        || (typeof item.gross === 'number' && item.gross > 0)
        || (typeof item['Gross'] === 'number' && item['Gross'] > 0)
        || (typeof item.gross === 'string' && parseFloat(item.gross) > 0)
        || (typeof item['Gross'] === 'string' && parseFloat(item['Gross']) > 0);

      const employeeId = nameToEmployeeId[employeeName] || null;

      return {
        uploadedFileId: uploadId,
        employeeId,
        employeeName,
        month: recordMonth,
        year: recordYear,
        presentDays,
        absentDays,
        holidayDays,
        monthlySalary,
        attBonus,
        incentive,
        bonus,
        gross,
        netSalary,
        basicSalary: monthlySalary,
        hra: 0,
        da: 0,
        leaveDeduction: 0,
        pfDeduction: 0,
        professionalTax: 0,
        esiDeduction: 0,
        otherDeductions: advance,
        workingDays: presentDays,
        leaves: holidayDays,
        lop: absentDays,
        status: norm(item, 'status') || 'PENDING',
        isValid: item.isValid !== false,
        validationErrors: norm(item, 'validationErrors') || null,
        _hasNetSalary: hasNetSalary,
        _hasGross: hasGross
      };
    });

    const dbRecords = parsedDataRecords.map(({ _hasNetSalary, _hasGross, ...rest }) => rest);
    await prisma.parsedSalaryData.deleteMany({ where: { uploadedFileId: uploadId } });
    await prisma.parsedSalaryData.createMany({ data: dbRecords });

    let payslipsCreated = 0;
    let payslipsUpdated = 0;
    let payslipErrors: any[] = [];

    for (const record of parsedDataRecords) {
      if (!record.employeeId) {
        payslipErrors.push({ employeeName: record.employeeName, error: 'No employee ID found. Ensure the employee exists or the name is spelled correctly.' });
        continue;
      }

      const recordMonth = record.month;
      const recordYear = record.year;

      if (!recordMonth || !recordYear || recordMonth < 1 || recordMonth > 12) {
        payslipErrors.push({ employeeName: record.employeeName, error: `Missing or invalid month (${recordMonth}) or year (${recordYear})` });
        continue;
      }

      try {
        const basicSalary = record.monthlySalary;
        const hra = 0;
        const da = 0;
        const medicalAllowance = 0;
        const travelAllowance = 0;
        const specialAllowance = 0;
        const otherAllowances = 0;
        const bonus = record.attBonus + record.bonus;
        const incentive = record.incentive;

        const workingDaysInfo = calculateWorkingDays(recordYear, recordMonth);
        const workingDays = workingDaysInfo.workingDays;
        const totalDays = workingDaysInfo.totalDays;
        const weekendDays = workingDaysInfo.weekendDays;
        const presentDaysRecord = record.presentDays;
        const absentDaysRecord = record.absentDays;
        const holidayDaysRecord = record.holidayDays;
        const leaveDays = 0;
        const lopDays = 0;
        const payableDays = presentDaysRecord + holidayDaysRecord;

        const calculatedGross = record._hasGross && record.gross > 0 ? record.gross : calculateGrossSalary(basicSalary, hra, da, medicalAllowance, travelAllowance, specialAllowance, otherAllowances);
        const totalEarnings = roundOffAmount(calculatedGross + bonus + incentive);

        const calculatedPF = calculatePFDeduction(basicSalary);
        const calculatedESI = calculateESIDeduction(calculatedGross);
        const calculatedPT = calculateProfessionalTax(calculatedGross);

        const advanceDeduction = record.otherDeductions;
        const otherDeductions = 0;

        const totalDeductions = roundOffAmount(
          calculatedPF + calculatedESI + calculatedPT + otherDeductions + advanceDeduction
        );

        const netSalary = record._hasNetSalary && record.netSalary > 0 ? record.netSalary : roundOffAmount(totalEarnings - totalDeductions);
        const amountInWords = convertToWords(netSalary);

        const payslipData = {
          employeeId: record.employeeId,
          month: recordMonth,
          year: recordYear,
          totalDays,
          workingDays,
          presentDays: presentDaysRecord,
          absentDays: absentDaysRecord,
          leaveDays,
          holidayDays: holidayDaysRecord,
          weekendDays,
          lopDays,
          payableDays,
          basicSalary,
          hra,
          da,
          medicalAllowance,
          travelAllowance,
          specialAllowance,
          otherAllowances,
          bonus,
          incentive,
          overtimePay: 0,
          totalEarnings,
          pfDeduction: calculatedPF,
          esiDeduction: calculatedESI,
          professionalTax: calculatedPT,
          incomeTax: 0,
          leaveDeduction: 0,
          lateDeduction: 0,
          otherDeductions,
          advanceDeduction,
          totalDeductions,
          grossSalary: calculatedGross,
          netSalary,
          amountInWords
        };

        const existingPayslip = await prisma.payslip.findUnique({
          where: { employeeId_month_year: { employeeId: record.employeeId, month: recordMonth, year: recordYear } }
        });

        if (existingPayslip) {
          await prisma.payslip.update({
            where: { id: existingPayslip.id },
            data: payslipData
          });
          payslipsUpdated++;
        } else {
          await prisma.payslip.create({
            data: {
              ...payslipData,
              status: 'DRAFT'
            }
          });
          payslipsCreated++;
        }
      } catch (err: any) {
        payslipErrors.push({ employeeName: record.employeeName, error: err.message });
      }
    }

    await prisma.uploadedFile.update({
      where: { id: uploadId },
      data: { status: 'SAVED', recordCount: parsedDataRecords.length }
    });

    logger.info(`Upload saved: ${uploadId} — ${payslipsCreated} payslips created, ${payslipsUpdated} payslips updated, ${payslipErrors.length} errors`);

    return {
      saved: parsedDataRecords.length,
      payslipsCreated,
      payslipsUpdated,
      errors: payslipErrors
    };
  }

  static async deleteUpload(id: string, adminId: string) {
    const upload = await prisma.uploadedFile.findUnique({ where: { id } });
    if (!upload) {
      throw new AppError('Upload not found', 404);
    }

    if (fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    await prisma.parsedSalaryData.deleteMany({ where: { uploadedFileId: id } });
    await prisma.uploadedFile.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'UPLOAD_DELETE',
        entityType: 'UPLOADED_FILE',
        entityId: id,
        details: { fileName: upload.fileName }
      }
    });

    logger.info(`Upload deleted: ${id} (${upload.fileName})`);
    return { message: 'Upload deleted successfully' };
  }
}
