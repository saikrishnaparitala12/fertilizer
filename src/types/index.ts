export enum UserRole { ADMIN = 'ADMIN', MANAGER = 'MANAGER', RECEPTIONIST = 'RECEPTIONIST', CASHIER = 'CASHIER' }
export enum ProductUnit { PIECE = 'piece', KG = 'kg', GRAM = 'gram', LITRE = 'litre', PACKET = 'packet', BOX = 'box', BOTTLE = 'bottle', PAIR = 'pair', SET = 'set' }
export enum ProductStatus { ACTIVE = 'ACTIVE', INACTIVE = 'INACTIVE' }
export enum InvoiceStatus { PAID = 'PAID', UNPAID = 'UNPAID', CANCELLED = 'CANCELLED' }
export enum PaymentMethod { CASH = 'CASH', UPI = 'UPI', CARD = 'CARD', OTHER = 'OTHER' }
export enum InventoryTransactionType { STOCK_IN = 'STOCK_IN', SALE = 'SALE', STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT', RETURN = 'RETURN', DAMAGED = 'DAMAGED', MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT' }

export interface Admin { id: string; name: string; email: string; role: UserRole }

export interface Category { id: string; name: string; description?: string }

export interface Product {
  id: string; sku: string; name: string; description?: string;
  category_id?: string; categories?: { name: string };
  brand?: string; unit: ProductUnit; purchase_price: number;
  selling_price: number; current_stock: number; min_stock_threshold: number;
  image_url?: string; status: ProductStatus; created_at: string; updated_at: string;
}

export interface Customer {
  id: string; name: string; phone: string; email?: string;
  address?: string; gstin?: string; notes?: string;
  total_purchases: number; total_amount_spent: number;
  paid_total?: number; outstanding_total?: number; unpaid_count?: number;
  created_at: string; updated_at: string;
}

export interface InvoiceItem {
  id: string; invoice_id: string; product_id: string;
  product_name: string; product_sku: string; unit: string;
  quantity: number; unit_price: number; total_price: number;
}

export interface Invoice {
  id: string; invoice_number: string; customer_id: string; admin_id: string;
  subtotal: number; discount: number; adjustment: number; tax: number;
  calculated_total: number; final_total: number;
  payment_method: PaymentMethod; status: InvoiceStatus; notes?: string;
  created_at: string; updated_at: string;
  customers?: Customer; admins?: { name: string; email: string };
  invoice_items?: InvoiceItem[];
}

export interface InventoryTransaction {
  id: string; product_id: string; invoice_id?: string;
  type: InventoryTransactionType; quantity: number;
  stock_before: number; stock_after: number; reason?: string;
  admin_id: string; created_at: string;
  products?: { name: string; sku: string };
  admins?: { name: string };
}

export interface ShopSettings {
  id: string; shop_name: string; logo_url?: string; address?: string;
  phone?: string; email?: string; gstin?: string; invoice_prefix: string;
  invoice_footer?: string; currency: string; tax_percentage: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface BillMode { type: 'auto' | 'custom'; customTotal?: number }

export interface ApiResponse<T> { success: boolean; data: T; message?: string }
export interface PaginatedResponse<T> { success: boolean; data: T[]; meta: { total: number; page: number; limit: number } }

export interface DashboardSummary {
  today_revenue: number; today_orders: number; total_products: number;
  low_stock_products: number; out_of_stock_products: number;
  total_customers: number; total_revenue: number;
}
