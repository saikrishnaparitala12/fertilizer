import api from './client';
import type { Customer } from '../types';

export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/customers', { params }),
  get: (id: string) => api.get(`/api/customers/${id}`),
  findByPhone: (phone: string) => api.get('/api/customers/search', { params: { phone } }),
  create: (data: Partial<Customer>) => api.post('/api/customers', data),
  update: (id: string, data: Partial<Customer>) => api.patch(`/api/customers/${id}`, data),
  getPurchases: (id: string, params?: Record<string, unknown>) =>
    api.get(`/api/customers/${id}/purchases`, { params }),
};
