'use client';

import { Pencil, Mail, Phone, Building2, CreditCard, User, Shield, Landmark, Hash, Calendar, Briefcase, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EMPLOYMENT_STATUS_COLORS, normalizeEmploymentStatus } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

interface EmployeeViewProps {
  employee: any;
  onClose: () => void;
  onEdit: () => void;
}

export function EmployeeView({ employee, onClose, onEdit }: EmployeeViewProps) {
  if (!employee) return null;

  const InfoRow = ({ label, value, icon: Icon, highlight }: { label: string; value: any; icon?: any; highlight?: boolean }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
      {Icon && <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium mt-0.5 ${highlight ? 'text-blue-400 text-lg' : 'text-gray-200'} ${!value ? 'text-gray-600' : ''}`}>
          {value || '-'}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-100">{employee.employeeName}</DialogTitle>
              <p className="text-sm text-gray-400 mt-1">{employee.employeeCode} • {employee.department} • {employee.designation}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit} className="border-gray-700 text-gray-300">
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employment Status */}
          <div className="flex items-center gap-3">
            <Badge className={EMPLOYMENT_STATUS_COLORS[employee.employmentStatus] || ''}>
              {normalizeEmploymentStatus(employee.employmentStatus)}
            </Badge>
            <span className="text-xs text-gray-500">
              Joined {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
            </span>
          </div>

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoRow label="Employee Code" value={employee.employeeCode} icon={Hash} />
              <InfoRow label="Full Name" value={employee.employeeName} icon={User} />
              <InfoRow label="Email" value={employee.email} icon={Mail} />
              <InfoRow label="Phone Number" value={employee.phoneNumber} icon={Phone} />
              <InfoRow label="Department" value={employee.department} icon={Building2} />
              <InfoRow label="Designation" value={employee.designation} icon={Briefcase} />
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Identity & Government IDs */}
          <div>
            <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Identity & Government IDs
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoRow label="PAN Number" value={employee.panNumber} icon={CreditCard} />
              <InfoRow label="Aadhar Number" value={employee.aadharNumber} icon={CreditCard} />
              <InfoRow label="UAN Number" value={employee.uanNumber} icon={Hash} />
              <InfoRow label="PF Number" value={employee.pfNumber} icon={Hash} />
              <InfoRow label="ESI Number" value={employee.esiNumber} icon={Hash} />
              <InfoRow label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : '-'} icon={Calendar} />
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Bank Details */}
          <div>
            <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Bank Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <InfoRow label="Bank Name" value={employee.bankName} icon={Landmark} />
              <InfoRow label="Account Number" value={employee.bankAccountNumber} icon={CreditCard} />
              <InfoRow label="IFSC Code" value={employee.ifscCode} icon={Hash} />
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Salary Components */}
          <div>
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Salary Components
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Basic Salary', value: employee.basicSalary },
                { label: 'HRA', value: employee.hra },
                { label: 'DA', value: employee.da },
                { label: 'Medical Allowance', value: employee.medicalAllowance },
                { label: 'Travel Allowance', value: employee.travelAllowance },
                { label: 'Special Allowance', value: employee.specialAllowance },
                { label: 'Other Allowances', value: employee.otherAllowances },
              ].map(item => (
                <InfoRow key={item.label} label={item.label} value={`₹${(item.value || 0).toLocaleString('en-IN')}`} />
              ))}
            </div>
            <div className="mt-3 p-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Gross Salary</p>
                <p className="text-2xl font-bold text-white">₹{(employee.grossSalary || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Net Salary</p>
                <p className="text-2xl font-bold text-white">₹{(employee.netSalary || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Jibble Sync Info */}
          {(employee.jibbleEmployeeId || employee.syncStatus) && (
            <>
              <Separator className="bg-gray-700" />
              <div>
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-3">Jibble Sync</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoRow label="Jibble Employee ID" value={employee.jibbleEmployeeId} />
                  <InfoRow label="Sync Status" value={employee.syncStatus} />
                  <InfoRow label="Last Sync" value={employee.lastSyncTime ? new Date(employee.lastSyncTime).toLocaleString() : '-'} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
