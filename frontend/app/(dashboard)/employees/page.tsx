'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  MoreHorizontal,
  Users,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useEmployees, useDeleteEmployee, useEmployeeDependencies } from '@/hooks/use-employees';
import { EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_COLORS, normalizeEmploymentStatus } from '@/lib/constants';
import { EmployeeForm } from '@/components/employees/employee-form';
import { EmployeeView } from '@/components/employees/employee-view';
import { PayslipForm } from '@/components/payslips/payslip-form';

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPayslipForm, setShowPayslipForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const { data, isLoading } = useEmployees(page, limit, search, department, status);
  const deleteEmployee = useDeleteEmployee();
  const { data: dependencies } = useEmployeeDependencies(
    showDeleteConfirm && selectedEmployee ? selectedEmployee.id : ''
  );

  const employees = data?.employees || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleDelete = async (force = false) => {
    if (!selectedEmployee) return;
    try {
      await deleteEmployee.mutateAsync({ id: selectedEmployee.id, force });
      toast.success(force ? 'Employee and all related records deleted successfully' : 'Employee deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Employee Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all employee records and salary details</p>
        </div>
        <Button
          onClick={() => { setSelectedEmployee(null); setShowForm(true); }}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Employee
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search by name, email, code..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500"
              />
            </div>
            <Select value={department ?? 'all'} onValueChange={(v) => { setDepartment(v === 'all' ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[160px] bg-gray-800 border-gray-700 text-gray-300">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-gray-300">All Departments</SelectItem>
                {['Engineering', 'Human Resources', 'Finance', 'Sales', 'Marketing', 'Operations', 'IT', 'Legal', 'General'].map(d => (
                  <SelectItem key={d} value={d} className="text-gray-300">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status ?? 'all'} onValueChange={(v) => { setStatus(v === 'all' ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-gray-300">All Status</SelectItem>
                {EMPLOYMENT_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-gray-300">{s}</SelectItem>
                ))}
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
                  {['Code', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'Status', 'Basic Salary', 'Gross Salary', 'Net Salary', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      {[...Array(11)].map((_, j) => (
                        <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-700 rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No employees found</p>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp: any, index: number) => (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-3 py-3 text-sm font-mono text-blue-400">{emp.employeeCode}</td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-gray-200">{emp.employeeName}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-400 max-w-[160px] truncate">{emp.email}</td>
                      <td className="px-3 py-3 text-sm text-gray-400">{emp.phoneNumber || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-400">{emp.department}</td>
                      <td className="px-3 py-3 text-sm text-gray-400">{emp.designation}</td>
                      <td className="px-3 py-3">
                        <Badge className={EMPLOYMENT_STATUS_COLORS[emp.employmentStatus] || 'bg-gray-800 text-gray-400'}>
                          {normalizeEmploymentStatus(emp.employmentStatus)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-300">₹{(emp.basicSalary || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-200">₹{(emp.grossSalary || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-sm font-bold text-green-400">₹{(emp.netSalary || 0).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setShowView(true); }} className="text-gray-300 hover:bg-gray-700">
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setShowForm(true); }} className="text-gray-300 hover:bg-gray-700">
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400 hover:bg-red-900/30" onClick={() => { setSelectedEmployee(emp); setShowDeleteConfirm(true); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                              setSelectedEmployee(emp);
                              setSelectedPayslip(null);
                              setShowPayslipForm(true);
                            }} className="text-gray-300 hover:bg-gray-700">
                              <FileText className="w-4 h-4 mr-2" /> Payslip
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-gray-700 text-gray-300">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="border-gray-700 text-gray-300">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {showForm && (
          <EmployeeForm
            employee={selectedEmployee}
            onClose={() => { setShowForm(false); setSelectedEmployee(null); }}
            onSuccess={() => { setShowForm(false); setSelectedEmployee(null); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showView && selectedEmployee && (
          <EmployeeView
            employee={selectedEmployee}
            onClose={() => { setShowView(false); setSelectedEmployee(null); }}
            onEdit={() => { setShowView(false); setShowForm(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPayslipForm && selectedEmployee && (
          <PayslipForm
            payslip={selectedPayslip}
            employeeId={selectedEmployee.id}
            employeeName={selectedEmployee.employeeName}
            onClose={() => { setShowPayslipForm(false); setSelectedPayslip(null); }}
            onSuccess={() => { setShowPayslipForm(false); setSelectedPayslip(null); }}
          />
        )}
      </AnimatePresence>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Delete Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-400">
              Are you sure you want to delete <strong className="text-gray-200">{selectedEmployee?.employeeName}</strong>?
            </p>
            {dependencies && dependencies.total > 0 && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">This employee has related records:</span>
                </div>
                <ul className="text-sm text-yellow-300/80 space-y-1 ml-6">
                  {dependencies.payslips > 0 && <li>{dependencies.payslips} payslip(s)</li>}
                  {dependencies.attendance > 0 && <li>{dependencies.attendance} attendance record(s)</li>}
                  {dependencies.attendanceSummaries > 0 && <li>{dependencies.attendanceSummaries} attendance summary(ies)</li>}
                  {dependencies.emailLogs > 0 && <li>{dependencies.emailLogs} email log(s)</li>}
                  {dependencies.generatedPayslips > 0 && <li>{dependencies.generatedPayslips} generated payslip(s)</li>}
                  {dependencies.salaryHistory > 0 && <li>{dependencies.salaryHistory} salary history record(s)</li>}
                  {dependencies.parsedSalaryData > 0 && <li>{dependencies.parsedSalaryData} parsed salary record(s)</li>}
                </ul>
                <p className="text-xs text-yellow-400/60 mt-2">
                  Please delete these records first, or change the employee status to Inactive/Terminated instead.
                </p>
              </div>
            )}
            {dependencies && dependencies.total === 0 && (
              <p className="text-gray-400">This employee has no related records. Deletion is safe.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setSelectedEmployee(null); }} className="border-gray-700 text-gray-300">Cancel</Button>
            {dependencies && dependencies.total > 0 && (
              <Button
                variant="destructive"
                onClick={() => handleDelete(true)}
                disabled={deleteEmployee.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {deleteEmployee.isPending ? 'Deleting...' : 'Force Delete (All Records)'}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => handleDelete(false)}
              disabled={deleteEmployee.isPending || (dependencies && dependencies.total > 0)}
            >
              {deleteEmployee.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
