import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { productsApi, getProductImageUrl } from '../../api/products';
import { customersApi } from '../../api/customers';
import { invoicesApi } from '../../api/invoices';
import { useBillingStore } from '../../stores/billing.store';
import { formatCurrency, debounce } from '../../utils';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import type { Product, PaymentMethod } from '../../types';
import {
  Search, Plus, Minus, Trash2, UserPlus, ShoppingBag,
  Receipt, AlertCircle, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function BillingPage() {
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const navigate = useNavigate();

  const store = useBillingStore();

  const debouncedSetSearch = useCallback(debounce((v: unknown) => setDebouncedSearch(v as string), 300), []);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-billing', debouncedSearch],
    queryFn: () => productsApi.list({ search: debouncedSearch, status: 'ACTIVE', limit: 30 }).then(r => r.data.data),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: typeof newCustomer) => customersApi.create(data),
    onSuccess: (res) => {
      store.setCustomer(res.data.data);
      setShowCustomerModal(false);
      toast.success('Customer created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create customer'),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (data: unknown) => invoicesApi.create(data),
    onSuccess: (res) => {
      setCreatedInvoice(res.data.data);
      setShowInvoiceModal(true);
      store.clearBill();
      toast.success('Invoice created successfully!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create invoice'),
  });

  const handlePhoneSearch = async () => {
    if (!customerPhone.trim()) return;
    try {
      const res = await customersApi.findByPhone(customerPhone);
      if (res.data.data) {
        store.setCustomer(res.data.data);
        toast.success(`Found: ${res.data.data.name}`);
      } else {
        setNewCustomer(prev => ({ ...prev, phone: customerPhone }));
        setShowCustomerModal(true);
      }
    } catch {
      setNewCustomer(prev => ({ ...prev, phone: customerPhone }));
      setShowCustomerModal(true);
    }
  };

  const addProduct = (product: Product) => {
    if (product.current_stock === 0) { toast.error('Product is out of stock'); return; }
    const existing = store.cart.find(c => c.product.id === product.id);
    if (existing && existing.quantity >= product.current_stock) {
      toast.error(`Only ${product.current_stock} units available`);
      return;
    }
    store.addToCart({ product, quantity: 1 });
  };

  const handleQuantityChange = (productId: string, quantity: number, maxStock: number) => {
    if (quantity > maxStock) { toast.error(`Only ${maxStock} units available`); return; }
    store.updateQuantity(productId, quantity);
  };

  const handleGenerateInvoice = () => {
    if (!store.customer) { toast.error('Please select a customer'); return; }
    if (store.cart.length === 0) { toast.error('Cart is empty'); return; }
    createInvoiceMutation.mutate({
      customer_id: store.customer.id,
      items: store.cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
      discount: store.discount,
      adjustment: store.adjustment,
      tax: store.tax,
      custom_final_total: store.customFinalTotal,
      payment_method: store.paymentMethod,
      notes: store.notes,
    });
  };

  const products = (productsData as Product[]) || [];
  const subtotal = store.subtotal();
  const calculatedTotal = store.calculatedTotal();
  const finalTotal = store.finalTotal();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* LEFT: Product Search */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 bg-gray-50"
              placeholder="Search products by name or SKU..."
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); debouncedSetSearch(e.target.value); }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map(product => {
                const outOfStock = product.current_stock === 0;
                const inCart = store.cart.find(c => c.product.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    disabled={outOfStock}
                    className={`card p-3 text-left transition-all hover:shadow-md hover:border-indigo-300 active:scale-95 ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${inCart ? 'border-indigo-400 bg-indigo-50' : ''}`}
                  >
                    <div className="relative mb-2">
                      {product.image_url ? (
                        <img src={getProductImageUrl(product.image_url)} alt={product.name}
                          className="w-full h-24 object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-24 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-indigo-300" />
                        </div>
                      )}
                      {inCart && <span className="absolute top-1 right-1 badge-blue text-xs">{inCart.quantity}</span>}
                    </div>
                    <p className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-indigo-600">{formatCurrency(product.selling_price)}</span>
                      <span className={`text-xs ${outOfStock ? 'text-red-500' : product.current_stock <= product.min_stock_threshold ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {outOfStock ? 'Out of stock' : `${product.current_stock} ${product.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Bill */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
        {/* Customer */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</p>
          {store.customer ? (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
              <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {store.customer.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{store.customer.name}</p>
                <p className="text-xs text-gray-500">{store.customer.phone}</p>
              </div>
              <button onClick={() => store.setCustomer(null)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePhoneSearch()}
              />
              <button onClick={handlePhoneSearch} className="btn-primary px-3">
                <Search className="w-4 h-4" />
              </button>
              <button onClick={() => setShowCustomerModal(true)} className="btn-secondary px-3">
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {store.cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Click products to add them</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {store.cart.map(item => (
                <div key={item.product.id} className="px-4 py-3">
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
                      <button
                        onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.product.current_stock)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number" min={1} max={item.product.current_stock}
                        value={item.quantity}
                        onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value) || 1, item.product.current_stock)}
                        className="w-12 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.product.current_stock)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                      {formatCurrency(item.product.selling_price * item.quantity)}
                    </span>
                  </div>
                  {item.quantity > item.product.current_stock && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Only {item.product.current_stock} available
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill Summary */}
        {store.cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-20 flex-shrink-0">Discount</span>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                  <input type="number" min={0} value={store.discount}
                    onChange={e => store.setDiscount(parseFloat(e.target.value) || 0)}
                    className="input py-1 pl-5 text-sm text-right" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-20 flex-shrink-0">Adjustment</span>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                  <input type="number" value={store.adjustment}
                    onChange={e => store.setAdjustment(parseFloat(e.target.value) || 0)}
                    className="input py-1 pl-5 text-sm text-right" />
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-2">
                <div className="flex justify-between text-gray-700 font-medium">
                  <span>Calculated Total</span>
                  <span>{formatCurrency(calculatedTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-600 w-20 flex-shrink-0 text-xs">Custom Total</span>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                  <input type="number" min={0}
                    value={store.customFinalTotal ?? ''}
                    placeholder={String(calculatedTotal)}
                    onChange={e => store.setCustomFinalTotal(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="input py-1 pl-5 text-sm text-right" />
                </div>
              </div>

              {store.customFinalTotal !== undefined && store.customFinalTotal !== calculatedTotal && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Auto-adjustment: {formatCurrency(store.customFinalTotal - calculatedTotal)}
                </p>
              )}
            </div>

            <div className="bg-indigo-50 rounded-xl p-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Final Total</span>
              <span className="text-2xl font-bold text-indigo-600">{formatCurrency(finalTotal)}</span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {(['CASH', 'UPI', 'CARD', 'OTHER'] as PaymentMethod[]).map(method => (
                <button key={method}
                  onClick={() => store.setPaymentMethod(method)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-all ${store.paymentMethod === method ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                  {method}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              className="w-full py-3 text-base"
              loading={createInvoiceMutation.isPending}
              onClick={handleGenerateInvoice}
              icon={<Receipt className="w-5 h-5" />}
            >
              Generate Invoice
            </Button>

            <button onClick={store.clearBill} className="w-full text-xs text-gray-400 hover:text-red-500 py-1">
              Clear Bill
            </button>
          </div>
        )}
      </div>

      {/* New Customer Modal */}
      <Modal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Add Customer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCustomerModal(false)}>Cancel</Button>
            <Button loading={createCustomerMutation.isPending}
              onClick={() => createCustomerMutation.mutate(newCustomer)}>
              Save Customer
            </Button>
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
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-indigo-600">{formatCurrency(createdInvoice.final_total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium">{createdInvoice.payment_method}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
