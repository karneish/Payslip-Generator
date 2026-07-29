'use client';

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Users, UserX, RefreshCw, Calendar, TrendingUp, AlertTriangle,
  CheckCircle, Coffee, Zap, Eye, Wifi, WifiOff, Loader2, ChevronDown, ChevronUp,
  Check, Database, Filter, Search, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { toast } from 'sonner';
import { MONTHS, YEARS } from '@/lib/constants';
import {
  useSyncAttendance, useJibbleLiveAttendance, useMonthlySummary,
  useAttendanceDashboard, useJibbleTestConnection
} from '@/hooks/use-attendance';

const DAYS_OF_WEEK = ['All', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#6b7280'];

function toYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthDateRange(month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

export default function AttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(toYYYYMMDD(new Date()));
  const [selectedDay, setSelectedDay] = useState('All');
  const [showLive, setShowLive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { startDate, endDate } = useMemo(
    () => getMonthDateRange(selectedMonth, selectedYear),
    [selectedMonth, selectedYear]
  );

  const dashboardQuery = useAttendanceDashboard(selectedDate);
  const summaryQuery = useMonthlySummary(selectedMonth, selectedYear);
  const liveQuery = useJibbleLiveAttendance(startDate, endDate);
  const syncMutation = useSyncAttendance();
  const testConnectionQuery = useJibbleTestConnection();

  const dashboard = dashboardQuery.data?.data;
  const summary = useMemo(() => (summaryQuery.data?.data || []) as any[], [summaryQuery.data?.data]);
  const allLiveData = useMemo(() => (liveQuery.data?.data || []) as any[], [liveQuery.data?.data]);

  const filteredLiveData = useMemo(() => {
    let data = allLiveData;
    if (selectedDay !== 'All') {
      const dayIndex = DAYS_OF_WEEK.indexOf(selectedDay) - 1;
      data = data.filter((e: any) => new Date(e.date).getDay() === dayIndex);
    }
    return data;
  }, [allLiveData, selectedDay]);

  const liveData = filteredLiveData;

  useEffect(() => {
    if (allLiveData.length > 0) setShowLive(true);
  }, [allLiveData]);

  const handleFetchLive = useCallback(() => {
    setShowLive(true);
    liveQuery.refetch();
  }, [liveQuery]);

  const handleSync = useCallback(async () => {
    try {
      const result = await syncMutation.mutateAsync({ startDate, endDate });
      const msg = result.message || 'Attendance synced from Jibble';
      const provisioned = result.data?.employeesProvisioned || 0;
      toast.success(provisioned > 0 ? `${msg} (${provisioned} employees auto-provisioned)` : msg);
      summaryQuery.refetch();
      dashboardQuery.refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Sync failed');
    }
  }, [syncMutation, startDate, endDate, summaryQuery, dashboardQuery]);

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus('checking');
    try {
      const result = await testConnectionQuery.refetch();
      if (result.data?.success) {
        setConnectionStatus('connected');
        setConnectionDetails(result.data.data);
        toast.success(`Connected! Found ${result.data.data.peopleCount} people in Jibble`);
      } else {
        setConnectionStatus('failed');
        toast.error(result.error?.message || 'Connection failed');
      }
    } catch (err: any) {
      setConnectionStatus('failed');
      toast.error(err.message || 'Connection test failed');
    }
  }, [testConnectionQuery]);

  const toggleRow = useCallback((key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearDateFilter = useCallback(() => {
    setSelectedDate(toYYYYMMDD(new Date()));
    setSelectedDay('All');
  }, []);

  const dateEntries = useMemo(() => {
    if (!allLiveData.length || !selectedDate) return [];
    return allLiveData.filter((e: any) => e.date === selectedDate);
  }, [allLiveData, selectedDate]);

  const dateStats = useMemo(() => {
    const entries = dateEntries.length > 0 ? dateEntries : (selectedDay !== 'All' ? liveData : []);
    if (!entries.length && dateEntries.length === 0 && selectedDay === 'All') return null;

    const source = entries.length > 0 ? entries : allLiveData;
    if (!source.length) return null;

    const totalPeople = new Set(source.map((e: any) => e.personId)).size;
    const clockedIn = source.filter((e: any) => e.clockIn !== null).length;
    const present = source.filter((e: any) => e.status === 'PRESENT' || e.status === 'HALF_DAY').length;
    const absent = source.filter((e: any) => e.status === 'ABSENT').length;
    const halfDay = source.filter((e: any) => e.status === 'HALF_DAY').length;
    const weekend = source.filter((e: any) => e.status === 'WEEKEND').length;
    const notClockedIn = totalPeople - clockedIn;
    const lateArrivals = source.filter((e: any) => {
      if (!e.clockIn) return false;
      const d = new Date(e.clockIn);
      return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 15);
    }).length;
    const overtimePeople = source.filter((e: any) => (e.overtimeHours || 0) > 0).length;
    const avgHours = source.reduce((s: number, e: any) => s + (e.workedHours || 0), 0) / Math.max(present, 1);
    const totalHours = source.reduce((s: number, e: any) => s + (e.workedHours || 0), 0);
    const totalOvertime = source.reduce((s: number, e: any) => s + (e.overtimeHours || 0), 0);
    const totalBreak = source.reduce((s: number, e: any) => s + (e.breakMinutes || 0), 0);

    return { totalPeople, clockedIn, present, absent, halfDay, weekend, notClockedIn, lateArrivals, overtimePeople, avgHours, totalHours, totalOvertime, totalBreak };
  }, [dateEntries, allLiveData, liveData, selectedDate, selectedDay]);

  const statCards = useMemo(() => {
    if (dateStats) {
      return [
        { title: 'Present', value: dateStats.present, icon: CheckCircle, color: 'from-green-500 to-green-600' },
        { title: 'Clocked In', value: dateStats.clockedIn, icon: Users, color: 'from-blue-500 to-blue-600' },
        { title: 'Not Clocked In', value: dateStats.notClockedIn, icon: UserX, color: 'from-red-500 to-red-600' },
        { title: 'Late Arrivals', value: dateStats.lateArrivals, icon: AlertTriangle, color: 'from-purple-500 to-purple-600' },
        { title: 'Overtime', value: dateStats.overtimePeople, icon: Zap, color: 'from-cyan-500 to-cyan-600' },
        { title: 'Avg Hours', value: `${dateStats.avgHours.toFixed(1)}h`, icon: Clock, color: 'from-amber-500 to-amber-600' },
      ];
    }
    if (dashboard) {
      return [
        { title: "Today's Present", value: dashboard.todayPresent || 0, icon: CheckCircle, color: 'from-green-500 to-green-600' },
        { title: 'Clocked In Now', value: dashboard.currentWorking || 0, icon: Users, color: 'from-blue-500 to-blue-600' },
        { title: 'Not Clocked In', value: dashboard.notClockedIn || 0, icon: UserX, color: 'from-red-500 to-red-600' },
        { title: 'On Leave', value: dashboard.onLeave || 0, icon: Coffee, color: 'from-amber-500 to-amber-600' },
        { title: 'Late Arrivals', value: dashboard.lateArrivals || 0, icon: AlertTriangle, color: 'from-purple-500 to-purple-600' },
        { title: 'Overtime', value: dashboard.overtimeEmployees || 0, icon: Zap, color: 'from-cyan-500 to-cyan-600' },
      ];
    }
    return [
      { title: "Today's Present", value: 0, icon: CheckCircle, color: 'from-green-500 to-green-600' },
      { title: 'Clocked In Now', value: 0, icon: Users, color: 'from-blue-500 to-blue-600' },
      { title: 'Not Clocked In', value: 0, icon: UserX, color: 'from-red-500 to-red-600' },
      { title: 'On Leave', value: 0, icon: Coffee, color: 'from-amber-500 to-amber-600' },
      { title: 'Late Arrivals', value: 0, icon: AlertTriangle, color: 'from-purple-500 to-purple-600' },
      { title: 'Overtime', value: 0, icon: Zap, color: 'from-cyan-500 to-cyan-600' },
    ];
  }, [dateStats, dashboard]);

  const monthlyPieData = useMemo(() => {
    if (!summary.length) return [];
    const totals = summary.reduce(
      (acc: any, s: any) => ({
        present: acc.present + (s.presentDays || 0),
        absent: acc.absent + (s.absentDays || 0),
        leave: acc.leave + (s.leaveDays || 0),
        holiday: acc.holiday + (s.holidayDays || 0),
        weekend: acc.weekend + (s.weekendDays || 0),
      }),
      { present: 0, absent: 0, leave: 0, holiday: 0, weekend: 0 }
    );
    return [
      { name: 'Present', value: totals.present },
      { name: 'Absent', value: totals.absent },
      { name: 'Leave', value: totals.leave },
      { name: 'Holiday', value: totals.holiday },
      { name: 'Weekend', value: totals.weekend },
    ].filter(d => d.value > 0);
  }, [summary]);

  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (!allLiveData.length) return days.map(day => ({ day, present: 0, absent: 0 }));
    const dayCounts: Record<string, { present: number; absent: number }> = {};
    for (const d of days) dayCounts[d] = { present: 0, absent: 0 };
    for (const entry of allLiveData) {
      const dayName = days[new Date(entry.date).getDay()];
      if (entry.status === 'PRESENT' || entry.status === 'HALF_DAY') dayCounts[dayName].present++;
      else if (entry.status === 'ABSENT') dayCounts[dayName].absent++;
    }
    return days.map(day => ({ day, ...dayCounts[day] }));
  }, [allLiveData]);

  const employeeBreakdown = useMemo(() => {
    if (!liveData.length) return [];
    const byPerson = new Map<string, { name: string; hours: number; days: number; overtime: number }>();
    for (const entry of liveData) {
      const key = entry.personId;
      const existing = byPerson.get(key) || { name: entry.personName || entry.personId, hours: 0, days: 0, overtime: 0 };
      existing.hours += entry.workedHours || 0;
      existing.days += entry.status === 'PRESENT' ? 1 : 0;
      existing.overtime += entry.overtimeHours || 0;
      byPerson.set(key, existing);
    }
    return Array.from(byPerson.values()).sort((a, b) => b.hours - a.hours).slice(0, 15);
  }, [liveData]);

  const groupedByPerson = useMemo(() => {
    if (!liveData.length) return [];
    const grouped = new Map<string, { name: string; entries: any[]; totalHours: number; totalDays: number }>();
    for (const entry of liveData) {
      const key = entry.personId;
      if (!grouped.has(key)) grouped.set(key, { name: entry.personName || entry.personId, entries: [], totalHours: 0, totalDays: 0 });
      const g = grouped.get(key)!;
      g.entries.push(entry);
      g.totalHours += entry.workedHours || 0;
      if (entry.status === 'PRESENT' || entry.status === 'HALF_DAY') g.totalDays++;
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalHours - a.totalHours);
  }, [liveData]);

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const isFiltered = selectedDay !== 'All' || selectedDate !== toYYYYMMDD(new Date());

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Attendance Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            {selectedDateFormatted}
            {selectedDay !== 'All' && <span className="ml-2 text-cyan-400">&mdash; Filtered by {selectedDay}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={handleTestConnection} disabled={connectionStatus === 'checking'} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            {connectionStatus === 'checking' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
             connectionStatus === 'connected' ? <Check className="w-4 h-4 mr-2 text-green-400" /> :
             connectionStatus === 'failed' ? <WifiOff className="w-4 h-4 mr-2 text-red-400" /> :
             <Wifi className="w-4 h-4 mr-2" />}
            {connectionStatus === 'checking' ? 'Testing...' : connectionStatus === 'connected' ? 'Connected' : 'Test API'}
          </Button>
          <Button onClick={handleFetchLive} disabled={liveQuery.isFetching} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            {liveQuery.isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
            {liveQuery.isFetching ? 'Fetching...' : 'Fetch Live'}
          </Button>
          <Button onClick={handleSync} disabled={syncMutation.isPending} className="bg-gradient-to-r from-blue-600 to-blue-500">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync to Database'}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {connectionStatus === 'connected' && connectionDetails && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-green-800/50 bg-green-950/30">
              <CardContent className="p-3 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="text-sm text-green-300">
                  Jibble API connected. <span className="text-green-400 font-medium">{connectionDetails.peopleCount} team members</span> found.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {connectionStatus === 'failed' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-red-800/50 bg-red-950/30">
              <CardContent className="p-3 flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">Failed to connect to Jibble API. Check credentials in backend .env.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Date</span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            />
            <div className="w-px h-6 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Day</span>
            </div>
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {DAYS_OF_WEEK.map(d => (
                  <SelectItem key={d} value={d} className="text-gray-300">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-6 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Month</span>
            </div>
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)} className="text-gray-300">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px] bg-gray-800 border-gray-700 text-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)} className="text-gray-300">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFiltered && (
              <Button onClick={clearDateFilter} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200">
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
            {syncMutation.isSuccess && (
              <Badge className="bg-green-900/50 text-green-300 border border-green-700/50">
                Synced {new Date().toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.title + i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-lg card-hover bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-gray-400">{card.title}</p>
                <p className="text-2xl font-bold text-gray-100 mt-0.5">{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {dateStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total People', value: dateStats.totalPeople, color: 'text-gray-200' },
            { label: 'Present', value: dateStats.present, color: 'text-green-400' },
            { label: 'Half Day', value: dateStats.halfDay, color: 'text-yellow-400' },
            { label: 'Absent', value: dateStats.absent, color: 'text-red-400' },
            { label: 'Total Hours', value: `${dateStats.totalHours.toFixed(1)}h`, color: 'text-blue-400' },
            { label: 'Total Overtime', value: `${dateStats.totalOvertime.toFixed(1)}h`, color: 'text-orange-400' },
            { label: 'Total Break', value: `${dateStats.totalBreak}m`, color: 'text-purple-400' },
            { label: 'Avg Hours/Person', value: `${dateStats.avgHours.toFixed(1)}h`, color: 'text-cyan-400' },
          ].map((item, i) => (
            <Card key={i} className="border-0 bg-gray-900 border-gray-800">
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">{item.label}</p>
                <p className={`text-lg font-bold ${item.color} mt-0.5`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-gray-100">
              <Calendar className="w-4 h-4 text-blue-400" />
              Daily Breakdown ({MONTHS[selectedMonth - 1]} {selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveQuery.isFetching ? (
              <div className="flex items-center justify-center h-[280px]">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : allLiveData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-500 text-sm">
                <Database className="w-8 h-8 mb-2 text-gray-600" />
                <p>No data loaded</p>
                <p className="text-xs text-gray-600 mt-1">Click &quot;Fetch Live&quot; to load Jibble data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-gray-100">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Monthly Overview ({MONTHS[selectedMonth - 1]} {selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={monthlyPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {monthlyPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-500 text-sm">
                <Calendar className="w-8 h-8 mb-2 text-gray-600" />
                <p>No summary data</p>
                <p className="text-xs text-gray-600 mt-1">Click &quot;Sync to Database&quot; first</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showLive && liveData.length > 0 && (
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-gray-100">
              <Clock className="w-4 h-4 text-cyan-400" />
              Attendance Records
              {selectedDay !== 'All' && <span className="text-cyan-400">&mdash; {selectedDay}</span>}
              {selectedDate && <span className="text-gray-400">&mdash; {selectedDateFormatted}</span>}
              <Badge className="ml-2 bg-cyan-900/50 text-cyan-300 border border-cyan-700/50">{liveData.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900 z-10">
                  <tr className="border-b border-gray-700">
                    {['Employee', 'Date', 'Day', 'Clock In', 'Clock Out', 'Worked', 'Overtime', 'Break', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liveData.map((entry: any, i: number) => {
                    const d = new Date(entry.date);
                    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
                    return (
                      <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-200">{entry.personName || entry.personId}</td>
                        <td className="px-4 py-3 text-gray-400">
                          {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={
                            dayName === 'Sun' || dayName === 'Sat' ? 'bg-gray-800 text-gray-400 border border-gray-600/50' :
                            'bg-blue-900/30 text-blue-300 border border-blue-700/30'
                          }>{dayName}</Badge>
                        </td>
                        <td className="px-4 py-3 text-green-400 font-mono text-xs">
                          {entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-red-400 font-mono text-xs">
                          {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-200 font-medium">{entry.workedHours?.toFixed(1) || '0'}h</td>
                        <td className="px-4 py-3">
                          {(entry.overtimeHours || 0) > 0 ? (
                            <Badge className="bg-orange-900/50 text-orange-300 border border-orange-700/50">{entry.overtimeHours?.toFixed(1)}h</Badge>
                          ) : <span className="text-gray-500">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400">{entry.breakMinutes || 0}m</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            entry.status === 'PRESENT' ? 'bg-green-900/50 text-green-300 border border-green-700/50' :
                            entry.status === 'HALF_DAY' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                            entry.status === 'WEEKEND' ? 'bg-gray-800 text-gray-400 border border-gray-600/50' :
                            'bg-red-900/50 text-red-300 border border-red-700/50'
                          }>
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showLive && liveData.length > 0 && groupedByPerson.length > 0 && (
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base text-gray-100">
              Employee Summary {selectedDay !== 'All' && `(${selectedDay})`} &mdash; {MONTHS[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase w-8"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Employee</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Days Present</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Total Hours</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Avg Hrs/Day</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByPerson.map((g, i) => {
                    const avgHrs = g.totalDays > 0 ? g.totalHours / g.totalDays : 0;
                    const totalOt = g.entries.reduce((s: number, e: any) => s + (e.overtimeHours || 0), 0);
                    const rowKey = `person-${i}`;
                    return (
                      <Fragment key={rowKey}>
                        <tr className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors" onClick={() => toggleRow(rowKey)}>
                          <td className="px-2 py-3 text-gray-400">
                            {expandedRows.has(rowKey) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-200">{g.name}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-green-900/50 text-green-300 border border-green-700/50">{g.totalDays}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-200 font-medium">{g.totalHours.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-center text-gray-400">{avgHrs.toFixed(1)}h</td>
                          <td className="px-4 py-3 text-center">
                            {totalOt > 0 ? (
                              <Badge className="bg-orange-900/50 text-orange-300 border border-orange-700/50">{totalOt.toFixed(1)}h</Badge>
                            ) : <span className="text-gray-500">-</span>}
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedRows.has(rowKey) && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="bg-gray-950 px-8 py-3 border-b border-gray-700">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-gray-500">
                                          <th className="text-left py-1">Date</th>
                                          <th className="text-left py-1">Day</th>
                                          <th className="text-left py-1">Clock In</th>
                                          <th className="text-left py-1">Clock Out</th>
                                          <th className="text-right py-1">Worked</th>
                                          <th className="text-right py-1">Break</th>
                                          <th className="text-right py-1">OT</th>
                                          <th className="text-left py-1">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {g.entries.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((entry: any, j: number) => (
                                          <tr key={j} className="border-b border-gray-800/50 text-gray-300">
                                            <td className="py-1.5">
                                              {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className="py-1.5">
                                              {new Date(entry.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                                            </td>
                                            <td className="py-1.5 text-green-400 font-mono">
                                              {entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                                            </td>
                                            <td className="py-1.5 text-red-400 font-mono">
                                              {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                                            </td>
                                            <td className="py-1.5 text-right">{(entry.workedHours || 0).toFixed(1)}h</td>
                                            <td className="py-1.5 text-right">{entry.breakMinutes || 0}m</td>
                                            <td className="py-1.5 text-right">
                                              {(entry.overtimeHours || 0) > 0 ? <span className="text-orange-400">{entry.overtimeHours.toFixed(1)}h</span> : '-'}
                                            </td>
                                            <td className="py-1.5">
                                              <Badge className={
                                                entry.status === 'PRESENT' ? 'bg-green-900/30 text-green-300 border border-green-700/30' :
                                                entry.status === 'HALF_DAY' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/30' :
                                                entry.status === 'WEEKEND' ? 'bg-gray-800/50 text-gray-400 border border-gray-600/30' :
                                                'bg-red-900/30 text-red-300 border border-red-700/30'
                                              }>
                                                {entry.status}
                                              </Badge>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {showLive && liveData.length > 0 && employeeBreakdown.length > 0 && (
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base text-gray-100">
              Employee Work Hours {selectedDay !== 'All' && `(${selectedDay})`} &mdash; {MONTHS[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, employeeBreakdown.length * 28)}>
              <BarChart data={employeeBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} label={{ value: 'Hours', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={150} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="hours" name="Total Hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="overtime" name="Overtime" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {summary.length > 0 && (
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-gray-100">
              <Database className="w-4 h-4 text-purple-400" />
              Monthly Summary (Synced) &mdash; {MONTHS[selectedMonth - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-700">
                    {['Employee', 'Present', 'Absent', 'Leave', 'LOP', 'Payable', 'Worked Hrs', 'OT (hrs)'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-200">{s.employee?.employeeName || s.employeeId}</td>
                      <td className="px-4 py-3"><Badge className="bg-green-900/50 text-green-300 border border-green-700/50">{s.presentDays}</Badge></td>
                      <td className="px-4 py-3"><Badge className="bg-red-900/50 text-red-300 border border-red-700/50">{s.absentDays}</Badge></td>
                      <td className="px-4 py-3"><Badge className="bg-yellow-900/50 text-yellow-300 border border-yellow-700/50">{s.leaveDays}</Badge></td>
                      <td className="px-4 py-3 text-gray-400">{s.lopDays}</td>
                      <td className="px-4 py-3 font-medium text-gray-200">{s.payableDays}</td>
                      <td className="px-4 py-3 text-gray-300">{s.totalWorkedHours?.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        {(s.totalOvertimeHours || 0) > 0 ? (
                          <Badge className="bg-orange-900/50 text-orange-300 border border-orange-700/50">{s.totalOvertimeHours?.toFixed(1)}</Badge>
                        ) : <span className="text-gray-500">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {liveQuery.isError && (
        <Card className="border-red-800/50 bg-red-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Failed to fetch live attendance data</p>
              <p className="text-xs text-red-400/70 mt-1">
                {(liveQuery.error as any)?.response?.data?.message || (liveQuery.error as any)?.message || 'Unknown error. Check backend logs.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!showLive && !allLiveData.length && !summary.length && !dashboardQuery.isLoading && (
        <Card className="border-0 shadow-lg bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-2">No attendance data yet</p>
            <p className="text-gray-500 text-sm mb-4 text-center max-w-md">
              Use the date and day filters above, then click &quot;Fetch Live&quot; to load data from Jibble.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleTestConnection} variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <Wifi className="w-4 h-4 mr-2" /> Test API Connection
              </Button>
              <Button onClick={handleFetchLive} className="bg-gradient-to-r from-cyan-600 to-cyan-500">
                <Eye className="w-4 h-4 mr-2" /> Fetch Live from Jibble
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
