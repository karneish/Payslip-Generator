'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, Trash2, Send, Filter, ChevronLeft, ChevronRight, MoreHorizontal, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { MONTHS, YEARS, PAYSLIP_STATUS_COLORS } from '@/lib/constants';
import { PayslipReview } from '@/components/payslips/payslip-review';
import { PayslipForm } from '@/components/payslips/payslip-form';

const SKELETON_ROWS = [0, 1, 2, 3, 4];
const SKELETON_COLS = [0, 1, 2, 3, 4, 5, 6];

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('_t', String(Date.now()));
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      const { data } = await api.get(`/payslips?${params.toString()}`);
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
      toast.error('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, [page, month, year, limit]);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

  const handleGenerate = async (payslip: any) => {
    try {
      await api.post(`/payslips/${payslip.id}/generate`);
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
      const { data } = await api.get(`/payslips/${payslip.id}/download`, { responseType: 'blob' });
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
    const year = payslip.year || new Date().getFullYear();
    const netSalary = payslip.netSalary || 0;
    const empName = payslip.employee?.employeeName || 'Employee';

    const subject = encodeURIComponent(`Payslip for ${monthName} ${year}`);
    const body = encodeURIComponent(
      `Dear ${empName},\n\n` +
      `Please find attached your payslip for ${monthName} ${year}.\n\n` +
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
      await api.delete(`/payslips/${id}`);
      toast.success('Payslip deleted');
      fetchPayslips();
    } catch {
      toast.error('Delete failed');
    }
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
    tableContent = <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No payslips found</td></tr>;
  } else {
    tableContent = payslips.map((p, index) => (
      <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-200">{p.employee?.employeeName || 'N/A'}</p>
          <p className="text-xs text-gray-500">{p.employee?.employeeCode}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-300">{MONTHS[(p.month || 1) - 1]} {p.year}</td>
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
        <h1 className="text-2xl font-bold text-gray-100">Payslips</h1>
        <p className="text-gray-400 text-sm mt-1">Manage and generate employee payslips</p>
      </div>

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
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800/50">
                  {['Employee', 'Month/Year', 'Gross', 'Deductions', 'Net Salary', 'Status', 'Actions'].map(h => (
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
            onClose={() => { setShowEditForm(false); setSelectedPayslip(null); }}
            onSuccess={() => { setShowEditForm(false); setSelectedPayslip(null); fetchPayslips(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
