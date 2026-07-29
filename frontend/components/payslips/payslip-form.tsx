'use client';

import { useState, useEffect, useMemo } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useUpdatePayslip, useCreatePayslip } from '@/hooks/use-payslips';
import { MONTHS, PAYSLIP_STATUSES } from '@/lib/constants';

interface PayslipFormProps {
  payslip?: any;
  employeeId?: string;
  employeeName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass = "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500";

function numField(label: string, value: number, onChange: (v: number) => void, opts?: { min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-gray-400 text-xs">{label}</Label>
      <Input
        type="number"
        min={opts?.min ?? 0}
        max={opts?.max}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className={inputClass}
      />
    </div>
  );
}

export function PayslipForm({ payslip, employeeId, employeeName, onClose, onSuccess }: PayslipFormProps) {
  const isEditing = !!payslip;
  const [loading, setLoading] = useState(false);
  const updatePayslip = useUpdatePayslip();
  const createPayslip = useCreatePayslip();

  const [form, setForm] = useState({
    month: 1,
    year: new Date().getFullYear(),
    totalDays: 0,
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    weekendDays: 0,
    lopDays: 0,
    payableDays: 0,
    incomeTax: 0,
    leaveDeduction: 0,
    lateDeduction: 0,
    otherDeductions: 0,
    advanceDeduction: 0,
    pfDeduction: 0,
    esiDeduction: 0,
    professionalTax: 0,
    bonus: 0,
    incentive: 0,
    overtimePay: 0,
    basicSalary: 0,
    hra: 0,
    da: 0,
    medicalAllowance: 0,
    travelAllowance: 0,
    specialAllowance: 0,
    otherAllowances: 0,
    status: 'DRAFT' as string,
  });

  useEffect(() => {
    if (payslip) {
      setForm({
        month: payslip.month || 1,
        year: payslip.year || new Date().getFullYear(),
        totalDays: payslip.totalDays || 0,
        workingDays: payslip.workingDays || 0,
        presentDays: payslip.presentDays || 0,
        absentDays: payslip.absentDays || 0,
        leaveDays: payslip.leaveDays || 0,
        holidayDays: payslip.holidayDays || 0,
        weekendDays: payslip.weekendDays || 0,
        lopDays: payslip.lopDays || 0,
        payableDays: payslip.payableDays || 0,
        incomeTax: payslip.incomeTax || 0,
        leaveDeduction: payslip.leaveDeduction || 0,
        lateDeduction: payslip.lateDeduction || 0,
        otherDeductions: payslip.otherDeductions || 0,
        advanceDeduction: payslip.advanceDeduction || 0,
        pfDeduction: payslip.pfDeduction || 0,
        esiDeduction: payslip.esiDeduction || 0,
        professionalTax: payslip.professionalTax || 0,
        bonus: payslip.bonus || 0,
        incentive: payslip.incentive || 0,
        overtimePay: payslip.overtimePay || 0,
        basicSalary: payslip.basicSalary || 0,
        hra: payslip.hra || 0,
        da: payslip.da || 0,
        medicalAllowance: payslip.medicalAllowance || 0,
        travelAllowance: payslip.travelAllowance || 0,
        specialAllowance: payslip.specialAllowance || 0,
        otherAllowances: payslip.otherAllowances || 0,
        status: payslip.status || 'DRAFT',
      });
    }
  }, [payslip]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const gross = form.basicSalary + form.hra + form.da + form.medicalAllowance + form.travelAllowance + form.specialAllowance + form.otherAllowances;
  const totalEarnings = gross + form.bonus + form.incentive + form.overtimePay;
  const totalDeductions = form.pfDeduction + form.esiDeduction + form.professionalTax + form.incomeTax + form.leaveDeduction + form.lateDeduction + form.otherDeductions + form.advanceDeduction;
  const netSalary = totalEarnings - totalDeductions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await updatePayslip.mutateAsync({ id: payslip.id, ...form });
        toast.success('Payslip updated successfully');
      } else {
        await createPayslip.mutateAsync({ employeeId, ...form });
        toast.success('Payslip created successfully');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const Section = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
    <div>
      <h3 className={`text-xs font-semibold ${color} uppercase tracking-wider mb-3`}>{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">
            {isEditing ? 'Edit Payslip' : 'Create Payslip'} {employeeName ? `- ${employeeName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Month *</Label>
              <Select value={String(form.month)} onValueChange={v => handleChange('month', Number(v))}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)} className="text-gray-300">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Year *</Label>
              <Input type="number" min={2020} max={2100} value={form.year} onChange={e => handleChange('year', Number(e.target.value))} className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-400 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {PAYSLIP_STATUSES.map(s => <SelectItem key={s} value={s} className="text-gray-300">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Section title="Attendance" color="text-cyan-400">
            {numField('Total Days', form.totalDays, v => handleChange('totalDays', v))}
            {numField('Working Days', form.workingDays, v => handleChange('workingDays', v))}
            {numField('Present Days', form.presentDays, v => handleChange('presentDays', v))}
            {numField('Absent Days', form.absentDays, v => handleChange('absentDays', v))}
            {numField('Leave Days', form.leaveDays, v => handleChange('leaveDays', v))}
            {numField('Holiday Days', form.holidayDays, v => handleChange('holidayDays', v))}
            {numField('Weekend Days', form.weekendDays, v => handleChange('weekendDays', v))}
            {numField('LOP Days', form.lopDays, v => handleChange('lopDays', v))}
            {numField('Payable Days', form.payableDays, v => handleChange('payableDays', v))}
          </Section>

          <Section title="Salary Components" color="text-blue-400">
            {numField('Basic Salary', form.basicSalary, v => handleChange('basicSalary', v))}
            {numField('HRA', form.hra, v => handleChange('hra', v))}
            {numField('DA', form.da, v => handleChange('da', v))}
            {numField('Medical Allowance', form.medicalAllowance, v => handleChange('medicalAllowance', v))}
            {numField('Travel Allowance', form.travelAllowance, v => handleChange('travelAllowance', v))}
            {numField('Special Allowance', form.specialAllowance, v => handleChange('specialAllowance', v))}
            {numField('Other Allowances', form.otherAllowances, v => handleChange('otherAllowances', v))}
          </Section>

          <Section title="Bonuses & Incentives" color="text-green-400">
            {numField('Bonus', form.bonus, v => handleChange('bonus', v))}
            {numField('Incentive', form.incentive, v => handleChange('incentive', v))}
            {numField('Overtime Pay', form.overtimePay, v => handleChange('overtimePay', v))}
          </Section>

          <Section title="Deductions" color="text-red-400">
            {numField('PF Deduction', form.pfDeduction, v => handleChange('pfDeduction', v))}
            {numField('ESI Deduction', form.esiDeduction, v => handleChange('esiDeduction', v))}
            {numField('Professional Tax', form.professionalTax, v => handleChange('professionalTax', v))}
            {numField('Income Tax (TDS)', form.incomeTax, v => handleChange('incomeTax', v))}
            {numField('Leave Deduction', form.leaveDeduction, v => handleChange('leaveDeduction', v))}
            {numField('Late Deduction', form.lateDeduction, v => handleChange('lateDeduction', v))}
            {numField('Advance Deduction', form.advanceDeduction, v => handleChange('advanceDeduction', v))}
            {numField('Other Deductions', form.otherDeductions, v => handleChange('otherDeductions', v))}
          </Section>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="p-3 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500">Gross Salary</p>
              <p className="text-lg font-bold text-blue-300">{'\u20B9'}{gross.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500">Total Earnings</p>
              <p className="text-lg font-bold text-green-300">{'\u20B9'}{totalEarnings.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500">Total Deductions</p>
              <p className="text-lg font-bold text-red-300">{'\u20B9'}{totalDeductions.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
              <p className="text-xs text-blue-400">Net Salary</p>
              <p className="text-lg font-bold text-blue-200">{'\u20B9'}{netSalary.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Update' : 'Create'} Payslip</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
