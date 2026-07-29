import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Payslip, ApiResponse } from '@/types';

export function usePayslips(page = 1, limit = 10, month?: number, year?: number, status?: string) {
  return useQuery({
    queryKey: ['payslips', page, limit, month, year, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (month) params.append('month', String(month));
      if (year) params.append('year', String(year));
      if (status) params.append('status', status);
      const { data } = await api.get<ApiResponse<Payslip[]>>(`/payslips?${params}`);
      return data;
    },
  });
}

export function usePayslip(id: string) {
  return useQuery({
    queryKey: ['payslip', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payslip>>(`/payslips/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payslip: Partial<Payslip>) => {
      const { data } = await api.post<ApiResponse<Payslip>>('/payslips', payslip);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}

export function useUpdatePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payslip }: Partial<Payslip> & { id: string }) => {
      const { data } = await api.put<ApiResponse<Payslip>>(`/payslips/${id}`, payslip);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}

export function useDeletePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<ApiResponse<null>>(`/payslips/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}

export function useGeneratePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Payslip>>(`/payslips/${id}/generate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
    },
  });
}

export function usePayslipByEmployee(employeeId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['payslip-by-employee', employeeId, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({ employeeId, month: String(month), year: String(year), limit: '1' });
      const { data } = await api.get<ApiResponse<Payslip[]>>(`/payslips?${params}`);
      const payslips = data?.data || [];
      return payslips[0] || null;
    },
    enabled: !!employeeId && month > 0 && year > 0,
  });
}

export function usePayslipReview(id: string) {
  return useQuery({
    queryKey: ['payslip-review', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payslip>>(`/payslips/${id}/review`);
      return data;
    },
    enabled: !!id,
  });
}
