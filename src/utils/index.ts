export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export function getApiErrorMessage(error: unknown, fallback = 'Request failed. Please try again.'): string {
  if (!error || typeof error !== 'object') return fallback;
  const responseData = (error as { response?: { data?: { message?: unknown; errors?: unknown } } }).response?.data;
  const serverMessage = typeof responseData?.message === 'string' ? responseData.message : '';
  const details = Array.isArray(responseData?.errors)
    ? responseData.errors.map((item: any) => {
      const path = Array.isArray(item?.path) ? item.path.join('.') : '';
      return [path, item?.message].filter(Boolean).join(': ');
    }).filter(Boolean).join('; ')
    : '';
  if (serverMessage && details) return `${serverMessage}: ${details}`;
  if (serverMessage) return serverMessage;
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' && message ? message : fallback;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getStockStatus(stock: number, _minThreshold = 10): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (stock === 0) return 'OUT_OF_STOCK';
  if (stock < 10) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function getStockBadgeClass(stock: number, minThreshold: number): string {
  const status = getStockStatus(stock, minThreshold);
  if (status === 'OUT_OF_STOCK') return 'badge-red';
  if (status === 'LOW_STOCK') return 'badge-yellow';
  return 'badge-green';
}

export function getStockLabel(stock: number, minThreshold: number): string {
  const status = getStockStatus(stock, minThreshold);
  if (status === 'OUT_OF_STOCK') return 'Out of Stock';
  if (status === 'LOW_STOCK') return 'Low Stock';
  return 'In Stock';
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}
