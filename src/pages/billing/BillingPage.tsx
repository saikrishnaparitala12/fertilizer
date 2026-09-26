import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsApi, getProductImageUrl } from '../../api/products';
import { customersApi } from '../../api/customers';
import { invoicesApi } from '../../api/invoices';
import { useBillingStore } from '../../stores/billing.store';
import { formatCurrency, debounce, getApiErrorMessage } from '../../utils';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { InvoiceStatus } from '../../types';
import type { Product, Customer, PaymentMethod } from '../../types';
import {
  Search, Plus, Minus, Trash2, UserPlus, ShoppingBag,
  Receipt, AlertCircle, CheckCircle, ShoppingCart, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function BillingPage() {
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [paymentStatus, setPaymentStatus] = useState<InvoiceStatus>(InvoiceStatus.PAID);
  const navigate = useNavigate();

  const store = useBillingStore();

  const debouncedSetProductSearch = useCallback(debounce((v: unknown) => setDebouncedProductSearch(v as string), 300), []);
  const debouncedSetCustomerSearch = useCallback(debounce((v: unknown) => setDebouncedCustomerSearch(v as string), 300), []);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-billing', debouncedProductSearch],
    queryFn: () => productsApi.list({ search: debouncedProductSearch, status: 'ACTIVE', limit: 50 }).then(r => r.data.data),
  });

  const { data: customersData, isLoading: customersLoading, error: customersError } = useQuery({
    queryKey: ['customers-billing', debouncedCustomerSearch],
    queryFn: () => customersApi.list({ search: debouncedCustomerSearch, limit: 30 }).then(r => r.data.data),
    enabled: showCustomerPicker,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: typeof newCustomer) => customersApi.create(data),
    onSuccess: (res) => {
      store.setCustomer(res.data.data);
      setShowNewCustomerModal(false);
      setShowCustomerPicker(false);
      toast.success('Customer created');
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to create customer')),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: unknown) => invoicesApi.create(data),
    onSuccess: (res) => {
      setCreatedInvoice(res.data.data);
      setShowInvoiceModal(true);
      store.clearBill();
      setPaymentStatus(InvoiceStatus.PAID);
      setMobileTab('products');
      toast.success('Invoice created successfully!');
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to create invoice')),
  });

  const selectCustomer = (c: Customer) => {
    store.setCustomer(c);
    setShowCustomerPicker(false);
    setCustomerSearch('');
    setDebouncedCustomerSearch('');
  };

  const addProduct = (product: Product) => {
    if (product.current_stock === 0) { toast.error('Out of stock'); return; }
    const existing = store.cart.find(c => c.product.id === product.id);
    if (existing && existing.quantity >= product.current_stock) {
      toast.error(`Only ${product.current_stock} units available`); return;
    }
    store.addToCart({ product, quantity: 1 });
    toast.success(`Added`, { duration: 600 });
  };

  const handleQuantityChange = (productId: string, quantity: number, maxStock: number) => {
    if (quantity < 1) { store.removeFromCart(productId); return; }
    if (quantity > maxStock) { toast.error(`Only ${maxStock} units available`); return; }
    store.updateQuantity(productId, quantity);
  };

  const handleGenerateInvoice = () => {
    if (!store.customer) { toast.error('Please select a customer'); return; }
    if (store.cart.length === 0) { toast.error('Cart is empty'); return; }
    createInvoiceMutation.mutate({
      customer_id: store.customer.id,
      items: store.cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
      discount: store.discountNum(),
      adjustment: store.adjustmentNum(),
      tax: store.taxNum(),
      custom_final_total: store.customFinalTotalNum(),
      payment_method: paymentStatus === InvoiceStatus.PAID ? store.paymentMethod : 'OTHER',
      status: paymentStatus,
      notes: store.notes || undefined,
    });
  };

  const products = (productsData as Product[]) || [];
  const customers = Array.isArray(customersData)
    ? customersData as Customer[]
    : Array.isArray((customersData as any)?.data) ? (customersData as any).data as Customer[] : [];
  const subtotal = store.subtotal();
  const calculatedTotal = store.calculatedTotal();
  const finalTotal = store.finalTotal();
  const cartCount = store.cart.reduce((s, i) => s + i.quantity, 0);

  // ── Customer Picker Modal ─────────────────────────────────────
  const CustomerPicker = (
    <Modal open={showCustomerPicker} onClose={() => setShowCustomerPicker(false)} title="Select Customer"
      footer={
        <Button icon={<UserPlus className="w-4 h-4" />} onClick={() => { setShowNewCustomerModal(true); }}>
          New Customer
        </Button>
      }>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or phone..."
            value={customerSearch}
            onChange={e => { setCustomerSearch(e.target.value); debouncedSetCustomerSearch(e.target.value); }}
            autoFocus />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
          {customersLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : customersError ? (
            <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 rounded-md">{getApiErrorMessage(customersError, 'Could not load customers')}</div>
          ) : customers.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No customers found</div>
          ) : (
            customers.map((c: Customer) => (
              <button key={c.id} onClick={() => selectCustomer(c)}
                className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 text-left transition-colors">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );

  // ── Product Grid ──────────────────────────────────────────────
  const ProductGrid = (
    <div className="flex-1 overflow-y-auto p-3">
      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-3 animate-pulse">
              <div className="h-20 bg-gray-200 rounded-lg mb-2" />
              <div className="h-3 bg-gray-200 rounded mb-1" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <ShoppingBag className="w-12 h-12 mb-3" />
          <p>No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map(product => {
            const outOfStock = product.current_stock === 0;
            const inCart = store.cart.find(c => c.product.id === product.id);
            return (
              <button key={product.id} onClick={() => addProduct(product)} disabled={outOfStock}
                className={`card p-2 text-left transition-all active:scale-95 ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-indigo-300'} ${inCart ? 'border-indigo-400 bg-indigo-50' : ''}`}>
                <div className="relative mb-2">
                  {product.image_url ? (
                    <img src={getProductImageUrl(product.image_url)} alt={product.name} className="w-full h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-20 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-7 h-7 text-indigo-300" />
                    </div>
                  )}
                  {inCart && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {inCart.quantity}
                    </span>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-semibold text-red-500">Out of Stock</span>
                    </div>
                  )}
                </div>
                <p className="font-medium text-gray-900 text-xs leading-tight line-clamp-2">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-bold text-indigo-600 text-sm">{formatCurrency(product.selling_price)}</span>
                  <span className={`text-xs ${outOfStock ? 'text-red-500' : product.current_stock < 10 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {outOfStock ? 'Out' : `${product.current_stock}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Cart Panel ────────────────────────────────────────────────
  const CartPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Customer */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</p>
        {store.customer ? (
          <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {store.customer.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{store.customer.name}</p>
              <p className="text-xs text-gray-500">{store.customer.phone}</p>
            </div>
            <button onClick={() => store.setCustomer(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowCustomerPicker(true)}
            className="w-full flex items-center gap-2 p-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
            <UserPlus className="w-4 h-4" />
            Select Customer
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {store.cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Tap products to add</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {store.cart.map(item => (
              <div key={item.product.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.product.selling_price)} / {item.product.unit}</p>
                  </div>
                  <button onClick={() => store.removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.product.current_stock)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input type="number" min={1} max={item.product.current_stock} value={item.quantity}
                      onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value) || 1, item.product.current_stock)}
                      className="w-10 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <button onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.product.current_stock)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{formatCurrency(item.product.selling_price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bill Summary */}
      {store.cart.length > 0 && (
        <div className="border-t border-gray-200 p-3 space-y-2 flex-shrink-0">
          {/* Subtotal */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal ({cartCount} items)</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 w-24 flex-shrink-0">Discount (₹)</span>
            <input type="text" inputMode="decimal"
              value={store.discount}
              onChange={e => store.setDiscount(e.target.value)}
              placeholder="0"
              className="input py-1 text-sm text-right flex-1" />
          </div>

          {/* Adjustment */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 w-24 flex-shrink-0">Adjustment (₹)</span>
            <input type="text" inputMode="decimal"
              value={store.adjustment}
              onChange={e => store.setAdjustment(e.target.value)}
              placeholder="0"
              className="input py-1 text-sm text-right flex-1" />
          </div>

          {/* Calculated Total */}
          <div className="flex justify-between text-sm font-medium text-gray-700 border-t border-dashed border-gray-200 pt-2">
            <span>Calculated Total</span>
            <span>{formatCurrency(calculatedTotal)}</span>
          </div>

          {/* Custom Final Total */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 w-24 flex-shrink-0">Custom Total</span>
            <input type="text" inputMode="decimal"
              value={store.customFinalTotal}
              onChange={e => store.setCustomFinalTotal(e.target.value)}
              placeholder={String(calculatedTotal.toFixed(2))}
              className="input py-1 text-sm text-right flex-1" />
          </div>

          {store.customFinalTotal !== '' && parseFloat(store.customFinalTotal) !== calculatedTotal && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Diff: {formatCurrency(parseFloat(store.customFinalTotal) - calculatedTotal)}
            </p>
          )}

          {/* Final Total */}
          <div className="bg-indigo-600 rounded-xl p-3 flex justify-between items-center">
            <span className="font-bold text-white text-sm">Final Total</span>
            <span className="text-xl font-bold text-white">{formatCurrency(finalTotal)}</span>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-2 gap-1 rounded-md bg-gray-100 p-1" role="group" aria-label="Invoice payment status">
            {([InvoiceStatus.PAID, InvoiceStatus.UNPAID] as const).map(status => (
              <button key={status} onClick={() => setPaymentStatus(status)} aria-pressed={paymentStatus === status}
                className={`min-h-10 rounded px-3 py-2 text-sm font-semibold transition-colors ${paymentStatus === status ? status === InvoiceStatus.PAID ? 'bg-emerald-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                {status === InvoiceStatus.PAID ? 'Paid now' : 'Unpaid / credit'}
              </button>
            ))}
          </div>

          {paymentStatus === InvoiceStatus.PAID && (
            <div className="grid grid-cols-4 gap-1">
              {(['CASH', 'UPI', 'CARD', 'OTHER'] as PaymentMethod[]).map(method => (
                <button key={method} onClick={() => store.setPaymentMethod(method)} aria-pressed={store.paymentMethod === method}
                  className={`min-h-9 rounded-md text-xs font-semibold border transition-colors ${store.paymentMethod === method ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {method}
                </button>
              ))}
            </div>
          )}

          <Button variant="primary" className="w-full py-3 text-sm font-semibold"
            loading={createInvoiceMutation.isPending}
            onClick={handleGenerateInvoice}
            icon={<Receipt className="w-4 h-4" />}>
            <span>{paymentStatus === InvoiceStatus.PAID ? 'Create paid invoice' : 'Create unpaid invoice'}</span>
            <span className="whitespace-nowrap tabular-nums">{formatCurrency(finalTotal)}</span>
          </Button>

          <button onClick={() => { store.clearBill(); setPaymentStatus(InvoiceStatus.PAID); }} className="w-full text-xs text-gray-400 hover:text-red-500 py-1">
            Clear Bill
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col bg-gray-100 overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-100">
          <div className="bg-white border-b border-gray-200 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9 bg-gray-50" placeholder="Search products by name or SKU..."
                value={productSearch}
                onChange={e => { setProductSearch(e.target.value); debouncedSetProductSearch(e.target.value); }} />
            </div>
          </div>
          {ProductGrid}
        </div>
        <div className="bg-white border-l border-gray-200 flex flex-col shadow-xl overflow-hidden" style={{ width: '360px' }}>
          {CartPanel}
        </div>
      </div>

      {/* ── MOBILE layout ── */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden">
        <div className="bg-white border-b border-gray-200 flex flex-shrink-0">
          <button onClick={() => setMobileTab('products')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mobileTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
            <ShoppingBag className="w-4 h-4" />
            Products
          </button>
          <button onClick={() => setMobileTab('cart')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mobileTab === 'cart' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}>
            <ShoppingCart className="w-4 h-4" />
            Cart
            {cartCount > 0 && (
              <span className="w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
            )}
          </button>
        </div>

        {mobileTab === 'products' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
            <div className="bg-white border-b border-gray-200 p-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="input pl-9 bg-gray-50" placeholder="Search products..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); debouncedSetProductSearch(e.target.value); }} />
              </div>
            </div>
            {ProductGrid}
            {cartCount > 0 && (
              <button onClick={() => setMobileTab('cart')}
                className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-semibold text-sm z-50 whitespace-nowrap">
                <ShoppingCart className="w-4 h-4" />
                Cart ({cartCount}) · {formatCurrency(finalTotal)}
              </button>
            )}
          </div>
        )}

        {mobileTab === 'cart' && (
          <div className="flex-1 overflow-hidden bg-white">
            {CartPanel}
          </div>
        )}
      </div>

      {/* Customer Picker */}
      {CustomerPicker}

      {/* New Customer Modal */}
      <Modal open={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} title="Add New Customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewCustomerModal(false)}>Cancel</Button>
            <Button loading={createCustomerMutation.isPending} onClick={() => createCustomerMutation.mutate(newCustomer)}>
              Save Customer
            </Button>
            Generate paid invoice
          </>
        }>
        <div className="space-y-4">
          <Input label="Full Name *" value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Customer name" />
          <Input label="Phone *" value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit phone" />
          <Input label="Email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} placeholder="Optional" />
          <Input label="Address" value={newCustomer.address} onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))} placeholder="Optional" />
        </div>
      </Modal>

      {/* Invoice Success Modal */}
      <Modal open={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title="Invoice Generated" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowInvoiceModal(false); navigate(`/invoices/${createdInvoice?.id}`); }}>
              View Invoice
            </Button>
            <Button onClick={() => setShowInvoiceModal(false)} icon={<Plus className="w-4 h-4" />}>
              New Bill
            </Button>
          </>
        }>
        {createdInvoice && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{createdInvoice.invoice_number}</h3>
            <p className="text-gray-500 mt-1">Invoice created successfully</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-xl text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{createdInvoice.customers?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{createdInvoice.invoice_items?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-indigo-600 text-lg">{formatCurrency(createdInvoice.final_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium">{createdInvoice.status === 'UNPAID' ? 'Unpaid' : createdInvoice.payment_method}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
