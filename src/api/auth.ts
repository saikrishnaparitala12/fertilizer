import api from './client';

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  register: (data: { name: string; email: string; phone: string; password: string }) =>
    api.post('/api/auth/register', data),
  changePassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/change-password', data),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};
