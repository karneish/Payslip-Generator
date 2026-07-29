import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Employee, ApiResponse, PaginatedResponse, EmployeeDependencies } from '@/types';

export function useEmployees(page = 1, limit = 10, search = '', department = '', status = '') {
  return useQuery({
    queryKey: ['employees', page, limit, search, department, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (status) params.append('status', status);
      const { data } = await api.get<PaginatedResponse<Employee>>(`/employees?${params}`);
      return data;
    },
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employee: Partial<Employee>) => {
      const { data } = await api.post<ApiResponse<Employee>>('/employees', employee);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...employee }: Partial<Employee> & { id: string }) => {
      const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, employee);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => {
      const url = force ? `/employees/${id}?force=true` : `/employees/${id}`;
      const { data } = await api.delete<ApiResponse<null>>(url);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useExportEmployees(format: string) {
  return useQuery({
    queryKey: ['employees-export', format],
    queryFn: async () => {
      const { data } = await api.get(`/employees/export/${format}`, { responseType: 'blob' });
      return data;
    },
    enabled: false,
  });
}

export function useEmployeeDependencies(id: string) {
  return useQuery({
    queryKey: ['employee-dependencies', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: EmployeeDependencies }>(`/employees/${id}/dependencies`);
      return data?.data;
    },
    enabled: !!id,
  });
}
