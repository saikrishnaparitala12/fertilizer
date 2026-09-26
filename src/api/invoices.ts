import api from './client';

export const invoicesApi = {
  preview: (data: unknown) => api.post('/api/invoices/preview', data),
  create: (data: unknown) => api.post('/api/invoices', data),
  list: (params?: Record<string, unknown>) => api.get('/api/invoices', { params }),
  get: (id: string) => api.get(`/api/invoices/${id}`),
  cancel: (id: string) => api.patch(`/api/invoices/${id}/cancel`),
  markPaid: (id: string, payment_method: string) => api.patch(`/api/invoices/${id}/pay`, { payment_method }),
};
