'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload as UploadIcon, FileSpreadsheet, FileText, X, Check, Save, AlertTriangle, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { MONTHS, YEARS } from '@/lib/constants';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [editableData, setEditableData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [saved, setSaved] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<any>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, [selectedMonth, selectedYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      toast.error('Unsupported file format. Please upload CSV or Excel files.');
      return;
    }
    setFile(f);
    setUploading(true);
    setUploadProgress(0);
    setSaveResult(null);
    setSaved(false);

    const formData = new FormData();
    formData.append('file', f);
    formData.append('month', String(selectedMonth));
    formData.append('year', String(selectedYear));

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': undefined },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const records = data?.preview || data?.data?.preview || data?.records || data?.data?.records || [];
      const id = data?.upload?.id || data?.data?.upload?.id || null;
      const totalFromServer = data?.totalRecords || data?.data?.totalRecords || records.length;

      setUploadId(id);
      setParsedData(Array.isArray(records) ? records : []);
      setEditableData(Array.isArray(records) ? records.map((r: any) => ({ ...r })) : []);
      toast.success(`File processed. ${totalFromServer} records found.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCellChange = (index: number, field: string, value: any) => {
    setEditableData(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };
      const numericFields = ['presentDays', 'absentDays', 'holidayDays', 'monthlySalary', 'attBonus', 'incentive', 'bonus', 'otherDeductions', 'gross', 'netSalary'];
      if (numericFields.includes(field)) {
        const parsed = parseFloat(value);
        row[field] = isNaN(parsed) ? 0 : parsed;
      } else {
        row[field] = value;
      }
      updated[index] = row;
      return updated;
    });
  };

  const HIDDEN_KEYS = ['id', 'uploadedFileId', 'employeeId', 'employeeCode', 'status', 'isValid', 'validationErrors', 'createdAt', '_month', '_year', '_attendance', '_hasNetSalary', '_hasGross', 'basicSalary', 'hra', 'da', 'leaveDeduction', 'pfDeduction', 'professionalTax', 'esiDeduction', 'workingDays', 'leaves', 'lop'];

  const EXCEL_COLUMNS = ['employeeName', 'presentDays', 'absentDays', 'holidayDays', 'monthlySalary', 'attBonus', 'incentive', 'bonus', 'otherDeductions', 'gross', 'netSalary'];

  const DISPLAY_NAMES: Record<string, string> = {
    employeeName: 'Employee Name',
    presentDays: 'Present',
    absentDays: 'Absent',
    holidayDays: 'Holiday',
    monthlySalary: 'Monthly Salary',
    attBonus: 'Att. Bonus',
    incentive: 'Incentive',
    bonus: 'Bonus',
    otherDeductions: 'Advance',
    gross: 'Gross',
    netSalary: 'Net Salary',
  };

  const getDisplayColumns = (keys: string[]) => {
    return EXCEL_COLUMNS.filter(k => keys.includes(k));
  };

  const handleSave = async () => {
    try {
      const dataWithMonthYear = editableData.map(row => ({
        ...row,
        month: row.month || selectedMonth,
        year: row.year || selectedYear,
      }));

      if (uploadId) {
        const { data } = await api.post(`/upload/${uploadId}/save`, {
          data: dataWithMonthYear,
        });
        const result = data?.data || data;
        setSaveResult(result);
        setSaved(true);
        const created = result?.payslipsCreated || 0;
        const updated = result?.payslipsUpdated || 0;
        const errCount = result?.errors?.length || 0;
        const parts = [];
        if (created > 0) parts.push(`${created} created`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (parts.length > 0) {
          toast.success(`Payslips: ${parts.join(', ')}`);
        } else if (errCount > 0) {
          toast.error('Payslips could not be created. Check errors below.');
        } else {
          toast.success('Payslips saved successfully');
        }
      } else {
        const { data: uploadResult } = await api.post('/upload', (() => {
          const fd = new FormData();
          if (file) fd.append('file', file);
          fd.append('month', String(selectedMonth));
          fd.append('year', String(selectedYear));
          return fd;
        })(), {
          headers: { 'Content-Type': undefined },
        });
        const newUploadId = uploadResult?.upload?.id || uploadResult?.data?.upload?.id;
        if (!newUploadId) {
          toast.error('Failed to re-upload file for saving');
          return;
        }
        const { data } = await api.post(`/upload/${newUploadId}/save`, {
          data: dataWithMonthYear,
        });
        const result = data?.data || data;
        setUploadId(newUploadId);
        setSaveResult(result);
        setSaved(true);
        const created = result?.payslipsCreated || 0;
        const updated = result?.payslipsUpdated || 0;
        const errCount = result?.errors?.length || 0;
        const parts = [];
        if (created > 0) parts.push(`${created} created`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (parts.length > 0) {
          toast.success(`Payslips: ${parts.join(', ')}`);
        } else if (errCount > 0) {
          toast.error('Payslips could not be created. Check errors below.');
        } else {
          toast.success('Payslips saved successfully');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setEditableData([]);
    setSaved(false);
    setUploadId(null);
    setUploadProgress(0);
    setSaveResult(null);
  };

  const inputClass = "bg-gray-800 border-gray-700 text-gray-200";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Upload Salary Data</h1>
        <p className="text-gray-400 text-sm mt-1">Upload Excel or CSV files — payslips are created automatically for the selected month and year</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-base text-gray-100">Upload Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Month</Label>
                <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)} className="text-gray-300">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Year</Label>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                  <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {YEARS.map(y => <SelectItem key={y} value={String(y)} className="text-gray-300">{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500">Payslips will be created for <strong className="text-gray-400">{MONTHS[selectedMonth - 1]} {selectedYear}</strong></p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
                  dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-blue-500/50 hover:bg-gray-800/50'
                }`}
              >
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-900/30 flex items-center justify-center">
                    <UploadIcon className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">Drop file here or click to browse</p>
                  <p className="text-xs text-gray-500 mt-1">Supports CSV, XLSX, XLS</p>
                </label>
              </div>

              {file && (
                <div className="mt-4 p-3 bg-gray-800 rounded-xl flex items-center gap-3">
                  {file.name.endsWith('.csv') ? (
                    <FileText className="w-8 h-8 text-green-400" />
                  ) : (
                    <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={handleReset} className="p-1 hover:bg-gray-700 rounded-lg">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}

              {uploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {editableData.length > 0 && !saved && (
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600">
              <Save className="w-4 h-4 mr-2" /> Save & Create Payslips
            </Button>
          )}

          {saved && saveResult && (
            <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <FileCheck className="w-5 h-5" />
                  <span className="font-semibold text-sm">Save Complete</span>
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>Records saved: <span className="text-gray-200">{saveResult.saved || editableData.length}</span></p>
                  <p>Payslips created: <span className="text-green-400 font-semibold">{saveResult.payslipsCreated || 0}</span></p>
                  {(saveResult.payslipsUpdated || 0) > 0 && (
                    <p>Payslips updated: <span className="text-blue-400 font-semibold">{saveResult.payslipsUpdated}</span></p>
                  )}
                  {saveResult.errors?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Errors:</p>
                      {saveResult.errors.map((err: any, i: number) => (
                        <p key={i} className="text-red-400/80 pl-4">• {err.employeeName}: {err.error}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {((saveResult.payslipsCreated || 0) > 0 || (saveResult.payslipsUpdated || 0) > 0) && (
                    <Button onClick={() => router.push('/payslips')} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                      View Payslips
                    </Button>
                  )}
                  <Button onClick={handleReset} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                    Upload Another File
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-100">
                  {editableData.length > 0 ? `Preview — ${editableData.length} Records` : 'Data Preview'}
                </CardTitle>
                {parsedData.length > 0 && (
                  <Badge variant="outline" className="border-gray-600 text-gray-400">{parsedData.length} rows</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {editableData.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Upload a file to preview salary data</p>
                  <p className="text-xs mt-1 text-gray-600">Supported columns: Employee Name, Present, Absent, Holiday, Monthly Salary, Att. Bonus, Incentive, Bonus, Advance, Gross, Net Salary</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">#</th>
                        {getDisplayColumns(Object.keys(editableData[0] || {})).map(key => (
                          <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase whitespace-nowrap">{DISPLAY_NAMES[key] || key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editableData.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="px-3 py-2 text-xs text-gray-500">{i + 1}</td>
                          {getDisplayColumns(Object.keys(row)).map(key => (
                            <td key={key} className="px-3 py-2">
                              <input
                                className="w-full bg-transparent border-0 p-0 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                                value={row[key] ?? ''}
                                onChange={e => handleCellChange(i, key, e.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
