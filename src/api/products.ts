import api from './client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const BUCKET = (import.meta.env.VITE_SUPABASE_BUCKET as string) || 'products';

export function getProductImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Image upload failed');
  }
  return path;
}

export const productsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/products', { params }),
  get: (id: string) => api.get(`/api/products/${id}`),
  create: (data: Record<string, unknown>) => api.post('/api/products', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/products/${id}`, data),
  delete: (id: string) => api.delete(`/api/products/${id}`),
  adjustStock: (data: { product_id: string; quantity: number; type: string; reason?: string }) =>
    api.post('/api/inventory/adjust', data),
  getInventoryHistory: (productId: string, params?: Record<string, unknown>) =>
    api.get(`/api/inventory/${productId}/history`, { params }),
};

export const categoriesApi = {
  list: () => api.get('/api/categories'),
};
