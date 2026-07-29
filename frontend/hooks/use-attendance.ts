import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Attendance, AttendanceSummary, ApiResponse } from '@/types';

export function useAttendanceList(params: { employeeId?: string; month?: number; year?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.employeeId) searchParams.append('employeeId', params.employeeId);
      if (params.month) searchParams.append('month', String(params.month));
      if (params.year) searchParams.append('year', String(params.year));
      searchParams.append('page', String(params.page || 1));
      searchParams.append('limit', String(params.limit || 50));
      const { data } = await api.get<ApiResponse<Attendance[]>>(`/attendance?${searchParams}`);
      return data;
    },
  });
}

export function useAttendanceDashboard(date?: string) {
  return useQuery({
    queryKey: ['attendance-dashboard', date || 'today'],
    queryFn: async () => {
      const params = date ? `?date=${date}` : '';
      const { data } = await api.get<ApiResponse<any>>(`/attendance/dashboard${params}`);
      return data;
    },
  });
}

export function useMonthlySummary(month: number, year: number) {
  return useQuery({
    queryKey: ['attendance-summary', month, year],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AttendanceSummary[]>>(`/attendance/monthly-summary?month=${month}&year=${year}`);
      return data;
    },
    enabled: !!month && !!year,
  });
}

export function useSyncAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { startDate: string; endDate: string }) => {
      const { data } = await api.post<ApiResponse<any>>('/jibble/sync', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['jibble-live-attendance'] });
    },
  });
}

export function useJibbleLiveAttendance(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['jibble-live-attendance', startDate, endDate],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>(`/jibble/live?startDate=${startDate}&endDate=${endDate}`);
      return data;
    },
    enabled: !!startDate && !!endDate,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJibbleTestConnection() {
  return useQuery({
    queryKey: ['jibble-test-connection'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/jibble/test-connection');
      return data;
    },
    enabled: false,
    retry: false,
  });
}

export function useJibbleEmployees() {
  return useQuery({
    queryKey: ['jibble-employees'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/jibble/employees');
      return data;
    },
    enabled: false,
    retry: false,
  });
}

export function useJibbleProvisionEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<any>>('/jibble/provision-employees');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['jibble-employees'] });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...attendance }: Partial<Attendance> & { id: string }) => {
      const { data } = await api.put<ApiResponse<Attendance>>(`/attendance/${id}`, attendance);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
