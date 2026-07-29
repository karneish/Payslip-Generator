'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { MONTHS } from '@/lib/constants';

interface PayslipReviewProps {
  payslip: any;
  onClose: () => void;
  onGenerate: () => void;
  onDownload: () => void;
}

export function PayslipReview({ payslip, onClose, onGenerate, onDownload }: PayslipReviewProps) {
  if (!payslip) return null;

  const emp = payslip.employee || {};
  const monthName = MONTHS[(payslip.month || 1) - 1];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">Payslip Review - {monthName} {payslip.year}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-3">Employee Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-500">Name:</span> <p className="font-medium text-gray-200">{emp.employeeName}</p></div>
              <div><span className="text-gray-500">Code:</span> <p className="font-medium text-gray-200">{emp.employeeCode}</p></div>
              <div><span className="text-gray-500">Department:</span> <p className="font-medium text-gray-200">{emp.department}</p></div>
              <div><span className="text-gray-500">Designation:</span> <p className="font-medium text-gray-200">{emp.designation}</p></div>
              <div><span className="text-gray-500">Month/Year:</span> <p className="font-medium text-gray-200">{monthName} {payslip.year}</p></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-300 mb-3">Earnings</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Basic Salary', value: payslip.basicSalary },
                  { label: 'HRA', value: payslip.hra },
                  { label: 'DA', value: payslip.da },
                  { label: 'Medical', value: payslip.medicalAllowance },
                  { label: 'Travel', value: payslip.travelAllowance },
                  { label: 'Special', value: payslip.specialAllowance },
                  { label: 'Other Allowances', value: payslip.otherAllowances },
                  { label: 'Bonus', value: payslip.bonus },
                  { label: 'Incentive', value: payslip.incentive },
                  { label: 'Overtime', value: payslip.overtimePay },
                ].filter(i => i.value > 0).map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-200">₹{(item.value || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <Separator className="bg-gray-700" />
                <div className="flex justify-between font-bold text-green-300">
                  <span>Total Earnings</span>
                  <span>₹{(payslip.totalEarnings || payslip.grossSalary || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-300 mb-3">Deductions</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'PF', value: payslip.pfDeduction },
                  { label: 'ESI', value: payslip.esiDeduction },
                  { label: 'Professional Tax', value: payslip.professionalTax },
                  { label: 'Income Tax', value: payslip.incomeTax },
                  { label: 'Late Deduction', value: payslip.lateDeduction },
                  { label: 'Leave Deduction', value: payslip.leaveDeduction },
                  { label: 'Advance/Loan Recovery', value: payslip.advanceDeduction },
                  { label: 'Other', value: payslip.otherDeductions },
                ].filter(i => i.value > 0).map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-200">₹{(item.value || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <Separator className="bg-gray-700" />
                <div className="flex justify-between font-bold text-red-300">
                  <span>Total Deductions</span>
                  <span>₹{(payslip.totalDeductions || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-4 text-white flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Net Salary</p>
              <p className="text-2xl font-bold">₹{(payslip.netSalary || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right text-sm opacity-80">
              <p>Working Days: {payslip.workingDays}</p>
              <p>Payable Days: {payslip.payableDays}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300">Back</Button>
            {payslip.pdfPath ? (
              <Button onClick={onDownload} className="bg-gradient-to-r from-green-600 to-green-500">Download PDF</Button>
            ) : (
              <Button onClick={onGenerate} className="bg-gradient-to-r from-blue-600 to-blue-500">Generate Payslip</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
