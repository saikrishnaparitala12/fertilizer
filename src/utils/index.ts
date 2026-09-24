export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getStockStatus(stock: number, minThreshold: number): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (stock === 0) return 'OUT_OF_STOCK';
  if (stock <= minThreshold) return 'LOW_STOCK';
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
