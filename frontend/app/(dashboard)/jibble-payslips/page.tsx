'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Eye, Trash2, Send, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, Pencil, RefreshCw, Save, CalendarDays, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { MONTHS, YEARS, PAYSLIP_STATUS_COLORS } from '@/lib/constants';
import { PayslipReview } from '@/components/payslips/payslip-review';
import { PayslipForm } from '@/components/payslips/payslip-form';

const SKELETON_ROWS = [0, 1, 2, 3, 4];
const SKELETON_COLS = [0, 1, 2, 3, 4, 5, 6];

const DAY_STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-900/50 text-green-300 border border-green-700/50',
  HALF_DAY: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  ABSENT: 'bg-red-900/50 text-red-300 border border-red-700/50',
  WEEKEND: 'bg-gray-800 text-gray-400 border border-gray-600/50',
};

export default function JibblePayslipsPage() {
  const now = new Date();
  const [previewMonth, setPreviewMonth] = useState<number>(now.getMonth() + 1);
  const [previewYear, setPreviewYear] = useState<number>(now.getFullYear());

  const [payslips, setPayslips] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const [preview, setPreview] = useState<any>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<any[]>([]);
  const [selectedDaysName, setSelectedDaysName] = useState('');

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('_t', String(Date.now()));
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      const { data } = await api.get(`/jibble-payslips?${params.toString()}`);
      if (data?.payslips) {
        setPayslips(data.payslips);
        setTotal(data.pagination?.total ?? 0);
      } else if (data && Array.isArray(data.data)) {
        setPayslips(data.data);
        setTotal(data.pagination?.total ?? data.data.length);
      } else {
        setPayslips([]);
        setTotal(0);
      }
    } catch {
      toast.error('Failed to load Jibble payslips');
    } finally {
      setLoading(false);
    }
  }, [page, month, year, limit]);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

  const handleFetchPreview = async () => {
    setFetchingPreview(true);
    setPreview(null);
    try {
      const { data } = await api.post('/jibble-payslips/preview', {
        month: previewMonth,
        year: previewYear,
      });
      setPreview(data?.data || null);
      toast.success(data?.data?.employees?.length
        ? `Fetched Jibble attendance for ${MONTHS[previewMonth - 1]} ${previewYear} (${data.data.employees.length} employees)`
        : 'No employees mapped to Jibble found');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch from Jibble. Check connection and mappings.');
    } finally {
      setFetchingPreview(false);
    }
  };

  const handleSavePayslips = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/jibble-payslips/save', {
        month: previewMonth,
        year: previewYear,
      });
      toast.success(data?.message || 'Jibble payslips saved successfully');
      setMonth(String(previewMonth));
      setYear(String(previewYear));
      setPage(1);
      fetchPayslips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save payslips');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (payslip: any) => {
    try {
      await api.post(`/jibble-payslips/${payslip.id}/generate`);
      toast.success('Payslip generated successfully');
      fetchPayslips();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Generation failed');
    }
  };

  const handleDownload = async (payslip: any) => {
    await downloadPdf(payslip);
  };

  const downloadPdf = async (payslip: any) => {
    try {
      const { data } = await api.get(`/jibble-payslips/${payslip.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      const empName = payslip.employee?.employeeName || 'Employee';
      const monthName = MONTHS[(payslip.month || 1) - 1];
      link.setAttribute('download', `${empName}_${monthName}_${payslip.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      return true;
    } catch {
      toast.error('Failed to download PDF');
      return false;
    }
  };

  const handleGmailSend = async (payslip: any) => {
    const employeeEmail = payslip.employee?.email;
    if (!employeeEmail) {
      toast.error('Employee has no email address');
      return;
    }

    const monthName = MONTHS[(payslip.month || 1) - 1];
    const yearValue = payslip.year || new Date().getFullYear();
    const netSalary = payslip.netSalary || 0;
    const empName = payslip.employee?.employeeName || 'Employee';

    const subject = encodeURIComponent(`Payslip for ${monthName} ${yearValue}`);
    const body = encodeURIComponent(
      `Dear ${empName},\n\n` +
      `Please find attached your payslip for ${monthName} ${yearValue}.\n\n` +
      `Net Salary: \u20B9${netSalary.toLocaleString('en-IN')}\n\n` +
      `Best regards,\nHR`
    );

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(employeeEmail)}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');

    const downloaded = await downloadPdf(payslip);
    if (downloaded) {
      toast.success('Gmail opened \u2014 drag the downloaded PDF into the compose window to attach it.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/jibble-payslips/${id}`);
      toast.success('Jibble payslip deleted');
      fetchPayslips();
    } catch {
      toast.error('Delete failed');
    }
  };

  const openDays = (entry: any) => {
    setSelectedDays(entry.days || []);
    setSelectedDaysName(entry.employee?.employeeName || 'Employee');
    setShowDays(true);
  };

  const totalPages = Math.ceil(total / limit);

  let tableContent: ReactNode;
  if (loading) {
    tableContent = SKELETON_ROWS.map(row => (
      <tr key={row} className="border-b border-gray-800">
        {SKELETON_COLS.map(col => (
          <td key={col} className="px-4 py-3"><div className="h-4 bg-gray-700 rounded animate-pulse w-24" /></td>
        ))}
      </tr>
    ));
  } else if (payslips.length === 0) {
    tableContent = <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No Jibble payslips found. Fetch from Jibble and save payslips above.</td></tr>;
  } else {
    tableContent = payslips.map((p, index) => (
      <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-200">{p.employee?.employeeName || 'N/A'}</p>
          <p className="text-xs text-gray-500">{p.employee?.employeeCode}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-300">{MONTHS[(p.month || 1) - 1]} {p.year}</td>
        <td className="px-4 py-3 text-sm text-gray-300">{p.presentDays || 0}<span className="text-gray-500"> / {p.halfDays || 0}</span></td>
        <td className="px-4 py-3 text-sm font-medium text-gray-200">₹{(p.grossSalary || 0).toLocaleString('en-IN')}</td>
        <td className="px-4 py-3 text-sm text-red-400">₹{(p.totalDeductions || 0).toLocaleString('en-IN')}</td>
        <td className="px-4 py-3 text-sm font-bold text-green-400">₹{(p.netSalary || 0).toLocaleString('en-IN')}</td>
        <td className="px-4 py-3"><Badge className={PAYSLIP_STATUS_COLORS[p.status] || ''}>{p.status}</Badge></td>
        <td className="px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={() => { setSelectedPayslip(p); setShowReview(true); }} className="text-gray-300 hover:bg-gray-700">
                <Eye className="w-4 h-4 mr-2" /> Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSelectedPayslip(p); setShowEditForm(true); }} className="text-gray-300 hover:bg-gray-700">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              {p.pdfPath ? (
                <DropdownMenuItem onClick={() => handleDownload(p)} className="text-gray-300 hover:bg-gray-700">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleGenerate(p)} className="text-gray-300 hover:bg-gray-700">
                  <FileText className="w-4 h-4 mr-2" /> Generate PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleGmailSend(p)} className="text-gray-300 hover:bg-gray-700">
                <Send className="w-4 h-4 mr-2" /> Send Email
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-400 hover:bg-red-900/30" onClick={() => handleDelete(p.id)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </motion.tr>
    ));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Jibble Payslips</h1>
        <p className="text-gray-400 text-sm mt-1">Attendance is calculated from Jibble hours worked per day &mdash; 8 hours = 1 present day. Saved separately from regular payslips.</p>
      </div>

      <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 block">Month</span>
              <Select value={String(previewMonth)} onValueChange={v => setPreviewMonth(Number(v))}>
                <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)} className="text-gray-300">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 block">Year</span>
              <Select value={String(previewYear)} onValueChange={v => setPreviewYear(Number(v))}>
                <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {YEARS.map(y => <SelectItem key={y} value={String(y)} className="text-gray-300">{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleFetchPreview}
              disabled={fetchingPreview}
              className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600"
            >
              {fetchingPreview ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Fetching...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Fetch from Jibble</>
              )}
            </Button>
            <Button
              onClick={handleSavePayslips}
              disabled={saving || !preview}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Payslips</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-100">Preview &mdash; {MONTHS[previewMonth - 1]} {previewYear}</h2>
                    <p className="text-xs text-gray-400">Attendance and salary computed from live Jibble data ({preview?.meta?.totalEmployees || 0} employees)</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">Present {preview?.totals?.presentDays || 0}</Badge>
                    <Badge className="bg-yellow-900/50 text-yellow-300 border border-yellow-700/50">Half {preview?.totals?.halfDays || 0}</Badge>
                    <Badge className="bg-red-900/50 text-red-300 border border-red-700/50">Absent {preview?.totals?.absentDays || 0}</Badge>
                    <Badge className="bg-green-900/50 text-green-300 border border-green-700/50">Net {'\u20B9'}{(preview?.totals?.netSalary || 0).toLocaleString('en-IN')}</Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700 bg-gray-800/50">
                        {['Employee', 'Present', 'Half', 'Absent', 'Paid Days', 'Worked Hrs', 'OT Hrs', 'Net Salary', 'Days'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.employees.map((entry: any, index: number) => (
                        <motion.tr key={entry.employee.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-200">{entry.employee?.employeeName}</p>
                            <p className="text-xs text-gray-500">{entry.employee?.employeeCode}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400">{entry.presentDays}</td>
                          <td className="px-4 py-3 text-sm text-yellow-400">{entry.halfDays}</td>
                          <td className="px-4 py-3 text-sm text-red-400">{entry.absentDays}</td>
                          <td className="px-4 py-3 text-sm text-gray-200">{entry.payableDays}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{entry.totalWorkedHours}h</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{entry.totalOvertimeHours}h</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-400">₹{(entry.salary?.netSalary || 0).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <Button variant="outline" size="sm" onClick={() => openDays(entry)} className="border-gray-700 text-gray-300 hover:text-gray-100">
                              <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Days
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={month ?? 'all'} onValueChange={v => { setMonth(v === 'all' ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-gray-300"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-gray-300">All Months</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)} className="text-gray-300">{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year ?? 'all'} onValueChange={v => { setYear(v === 'all' ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-gray-300"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-gray-300">All Years</SelectItem>
                {YEARS.map(y => <SelectItem key={y} value={String(y)} className="text-gray-300">{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-400 ml-auto">Saved Jibble Payslips</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  {['Employee', 'Month/Year', 'Present / Half', 'Gross', 'Deductions', 'Net Salary', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableContent}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-gray-700 text-gray-300"><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="border-gray-700 text-gray-300"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showReview && selectedPayslip && (
          <PayslipReview
            payslip={selectedPayslip}
            onClose={() => { setShowReview(false); setSelectedPayslip(null); }}
            onGenerate={() => { handleGenerate(selectedPayslip); setShowReview(false); }}
            onDownload={() => { handleDownload(selectedPayslip); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditForm && selectedPayslip && (
          <PayslipForm
            payslip={selectedPayslip}
            employeeId={selectedPayslip.employeeId}
            employeeName={selectedPayslip.employee?.employeeName}
            basePath="/jibble-payslips"
            onClose={() => { setShowEditForm(false); setSelectedPayslip(null); }}
            onSuccess={() => { setShowEditForm(false); setSelectedPayslip(null); fetchPayslips(); }}
          />
        )}
      </AnimatePresence>

      <Dialog open={showDays} onOpenChange={() => setShowDays(false)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-100">Daily Attendance - {selectedDaysName}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  {['Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Worked Hrs', 'OT Hrs'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedDays.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No attendance records</td></tr>
                )}
                {selectedDays.map((d: any) => (
                  <tr key={d.date} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-300">{d.date}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-300">{d.weekday}</td>
                    <td className="px-4 py-2.5"><Badge className={DAY_STATUS_COLORS[d.status] || ''}>{d.status}</Badge></td>
                    <td className="px-4 py-2.5 text-sm text-gray-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" />{d.clockIn || '\u2014'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" />{d.clockOut || '\u2014'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-200">{d.workedHours}h</td>
                    <td className="px-4 py-2.5 text-sm text-gray-300">{d.overtimeHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}