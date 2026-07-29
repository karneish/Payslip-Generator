'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { EMPLOYMENT_STATUSES, normalizeEmploymentStatus } from '@/lib/constants';
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/use-employees';

interface EmployeeFormProps {
  employee?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const isEditing = !!employee;
  const [loading, setLoading] = useState(false);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const [form, setForm] = useState({
    employeeCode: '',
    employeeName: '',
    email: '',
    phoneNumber: '',
    department: '',
    designation: '',
    panNumber: '',
    aadharNumber: '',
    uanNumber: '',
    pfNumber: '',
    esiNumber: '',
    bankName: '',
    bankAccountNumber: '',
    ifscCode: '',
    joiningDate: '',
    employmentStatus: 'Active',
    basicSalary: 0,
    hra: 0,
    da: 0,
    medicalAllowance: 0,
    travelAllowance: 0,
    specialAllowance: 0,
    otherAllowances: 0,
  });

  useEffect(() => {
    if (employee) {
      setForm({
        employeeCode: employee.employeeCode || '',
        employeeName: employee.employeeName || '',
        email: employee.email || '',
        phoneNumber: employee.phoneNumber || '',
        department: employee.department || '',
        designation: employee.designation || '',
        panNumber: employee.panNumber || '',
        aadharNumber: employee.aadharNumber || '',
        uanNumber: employee.uanNumber || '',
        pfNumber: employee.pfNumber || '',
        esiNumber: employee.esiNumber || '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        ifscCode: employee.ifscCode || '',
        joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
        employmentStatus: normalizeEmploymentStatus(employee.employmentStatus) || 'Active',
        basicSalary: employee.basicSalary || 0,
        hra: employee.hra || 0,
        da: employee.da || 0,
        medicalAllowance: employee.medicalAllowance || 0,
        travelAllowance: employee.travelAllowance || 0,
        specialAllowance: employee.specialAllowance || 0,
        otherAllowances: employee.otherAllowances || 0,
      });
    }
  }, [employee]);

  const grossSalary = form.basicSalary + form.hra + form.da + form.medicalAllowance + form.travelAllowance + form.specialAllowance + form.otherAllowances;

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await updateEmployee.mutateAsync({ id: employee.id, ...form });
        toast.success('Employee updated successfully');
      } else {
        await createEmployee.mutateAsync(form);
        toast.success('Employee created successfully');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">
            {isEditing ? 'Edit Employee' : 'Create Employee'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Employee Code *</Label>
              <Input value={form.employeeCode} onChange={e => handleChange('employeeCode', e.target.value)} required className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Full Name *</Label>
              <Input value={form.employeeName} onChange={e => handleChange('employeeName', e.target.value)} required className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Email *</Label>
              <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} required className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Phone Number</Label>
              <Input value={form.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Department *</Label>
              <Select value={form.department} onValueChange={v => handleChange('department', v)}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {['Engineering', 'Human Resources', 'Finance', 'Sales', 'Marketing', 'Operations', 'IT', 'Legal'].map(d => (
                    <SelectItem key={d} value={d} className="text-gray-300">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Designation *</Label>
              <Input value={form.designation} onChange={e => handleChange('designation', e.target.value)} placeholder="e.g. Software Engineer" required className={inputClass} />
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Identity & Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">PAN Number</Label>
                <Input value={form.panNumber} onChange={e => handleChange('panNumber', e.target.value.toUpperCase())} maxLength={10} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Aadhar Number</Label>
                <Input value={form.aadharNumber} onChange={e => handleChange('aadharNumber', e.target.value)} maxLength={12} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">UAN Number</Label>
                <Input value={form.uanNumber} onChange={e => handleChange('uanNumber', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">PF Number</Label>
                <Input value={form.pfNumber} onChange={e => handleChange('pfNumber', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">ESI Number</Label>
                <Input value={form.esiNumber} onChange={e => handleChange('esiNumber', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Joining Date</Label>
                <Input type="date" value={form.joiningDate} onChange={e => handleChange('joiningDate', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Bank Name</Label>
                <Input value={form.bankName} onChange={e => handleChange('bankName', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Bank Account Number</Label>
                <Input value={form.bankAccountNumber} onChange={e => handleChange('bankAccountNumber', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">IFSC Code</Label>
                <Input value={form.ifscCode} onChange={e => handleChange('ifscCode', e.target.value.toUpperCase())} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Salary Components</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: 'basicSalary', label: 'Basic Salary' },
                { key: 'hra', label: 'HRA' },
                { key: 'da', label: 'DA' },
                { key: 'medicalAllowance', label: 'Medical' },
                { key: 'travelAllowance', label: 'Travel' },
                { key: 'specialAllowance', label: 'Special' },
                { key: 'otherAllowances', label: 'Other' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-gray-300">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form[key as keyof typeof form] || ''}
                    onChange={e => handleChange(key, Number(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-900/30 border border-blue-700/50 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-blue-300">Gross Salary</span>
              <span className="text-lg font-bold text-blue-300">₹{grossSalary.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Employment Status</Label>
            <Select value={form.employmentStatus} onValueChange={v => handleChange('employmentStatus', v)}>
              <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {EMPLOYMENT_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-gray-300">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <><Save className="w-4 h-4 mr-2" /> {isEditing ? 'Update' : 'Create'} Employee</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
