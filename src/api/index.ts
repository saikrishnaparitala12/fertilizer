import api from './client';

export const dashboardApi = {
  summary: () => api.get('/api/dashboard/summary'),
  salesChart: (period: 'today' | 'week' | 'month') => api.get('/api/dashboard/sales-chart', { params: { period } }),
  topProducts: () => api.get('/api/dashboard/top-products'),
  recentSales: () => api.get('/api/dashboard/recent-sales'),
};

export const reportsApi = {
  sales: (params?: Record<string, unknown>) => api.get('/api/reports/sales', { params }),
  inventory: () => api.get('/api/reports/inventory'),
  productSales: (params?: Record<string, unknown>) => api.get('/api/reports/products', { params }),
};

export const settingsApi = {
  get: () => api.get('/api/settings'),
  update: (data: unknown) => api.patch('/api/settings', data),
};

export const inventoryApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/inventory', { params }),
};
