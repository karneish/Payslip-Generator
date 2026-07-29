'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  FileText,
  Download,
  Upload,
  Clock,
  TrendingUp,
  Building2,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '@/lib/axios';
import { normalizeEmploymentStatus } from '@/lib/constants';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, payslipRes, uploadRes] = await Promise.allSettled([
          api.get('/employees', { params: { page: 1, limit: 1000 } }),
          api.get('/payslips', { params: { page: 1, limit: 1000 } }),
          api.get('/upload', { params: { page: 1, limit: 1 } }),
        ]);

        const employees = empRes.status === 'fulfilled' ? (empRes.value.data?.employees || empRes.value.data?.data || []) : [];
        const payslips = payslipRes.status === 'fulfilled' ? (payslipRes.value.data?.payslips || payslipRes.value.data?.data || []) : [];
        const uploadTotal = uploadRes.status === 'fulfilled' ? (uploadRes.value.data?.pagination?.total || 0) : 0;

        const activeEmployees = employees.filter((e: any) => normalizeEmploymentStatus(e.employmentStatus) === 'Active');
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const currentMonthPayslips = payslips.filter((p: any) => p.month === currentMonth && p.year === currentYear);
        const generatedPayslips = payslips.filter((p: any) => p.status === 'GENERATED' || p.status === 'APPROVED' || p.status === 'PAID');
        const pendingPayslips = payslips.filter((p: any) => p.status === 'DRAFT');

        const deptMap: Record<string, number> = {};
        activeEmployees.forEach((e: any) => {
          const dept = e.department || 'Unknown';
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        });
        const departmentDistribution = Object.entries(deptMap).map(([department, count]) => ({ department, count }));

        const totalNet = activeEmployees.reduce((s: number, e: any) => s + (e.netSalary || 0), 0);
        const totalGross = activeEmployees.reduce((s: number, e: any) => s + (e.grossSalary || 0), 0);
        const avgNet = activeEmployees.length > 0 ? totalNet / activeEmployees.length : 0;
        const avgGross = activeEmployees.length > 0 ? totalGross / activeEmployees.length : 0;

        setStats({
          totalEmployees: employees.length,
          activeEmployees: activeEmployees.length,
          currentMonthPayslips: currentMonthPayslips.length,
          generatedPayslips: generatedPayslips.length,
          uploadedFiles: uploadTotal,
          pendingPayslips: pendingPayslips.length,
          departmentDistribution,
          salaryDistribution: { averageNet: avgNet, averageGross: avgGross, totalNet, totalGross, totalDeductions: totalGross - totalNet },
        });
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { title: 'Total Employees', value: stats?.totalEmployees || 0, icon: Users, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
    { title: 'Active Employees', value: stats?.activeEmployees || 0, icon: UserCheck, color: 'from-green-500 to-green-600', shadow: 'shadow-green-500/20' },
    { title: 'Current Month Payslips', value: stats?.currentMonthPayslips || 0, icon: FileText, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
    { title: 'Generated Payslips', value: stats?.generatedPayslips || 0, icon: Download, color: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20' },
    { title: 'Uploaded Salary Files', value: stats?.uploadedFiles || 0, icon: Upload, color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20' },
    { title: 'Pending Payslips', value: stats?.pendingPayslips || 0, icon: Clock, color: 'from-red-500 to-red-600', shadow: 'shadow-red-500/20' },
  ];

  const departmentData = stats?.departmentDistribution || [];

  const salaryData = stats?.salaryDistribution
    ? [
        { label: 'Avg Net', value: Math.round(stats.salaryDistribution.averageNet || 0) },
        { label: 'Avg Gross', value: Math.round(stats.salaryDistribution.averageGross || 0) },
        { label: 'Total Net', value: Math.round(stats.salaryDistribution.totalNet || 0) },
        { label: 'Total Gross', value: Math.round(stats.salaryDistribution.totalGross || 0) },
        { label: 'Total Deductions', value: Math.round(stats.salaryDistribution.totalDeductions || 0) },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-4" />
                <div className="h-8 bg-gray-700 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Welcome back! Here&apos;s an overview of your organization.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => (
          <motion.div key={card.title} variants={item}>
            <Card className={`card-hover border-0 shadow-lg ${card.shadow} bg-gray-900 border-gray-800 overflow-hidden`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-100 mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-gray-100">
                <Building2 className="w-4 h-4 text-green-400" />
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={departmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="department" paddingAngle={3}>
                    {departmentData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-gray-100">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Salary Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
