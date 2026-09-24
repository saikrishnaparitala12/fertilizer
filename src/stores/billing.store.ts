import { create } from 'zustand';
import type { CartItem, Customer, PaymentMethod } from '../types';

interface BillingState {
  customer: Customer | null;
  cart: CartItem[];
  discount: string;
  adjustment: string;
  tax: string;
  customFinalTotal: string;
  paymentMethod: PaymentMethod;
  notes: string;
  setCustomer: (customer: Customer | null) => void;
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  setDiscount: (v: string) => void;
  setAdjustment: (v: string) => void;
  setTax: (v: string) => void;
  setCustomFinalTotal: (v: string) => void;
  setPaymentMethod: (v: PaymentMethod) => void;
  setNotes: (v: string) => void;
  clearBill: () => void;
  subtotal: () => number;
  calculatedTotal: () => number;
  finalTotal: () => number;
  // numeric getters for API submission
  discountNum: () => number;
  adjustmentNum: () => number;
  taxNum: () => number;
  customFinalTotalNum: () => number | undefined;
}

const toNum = (v: string) => parseFloat(v) || 0;

export const useBillingStore = create<BillingState>((set, get) => ({
  customer: null,
  cart: [],
  discount: '',
  adjustment: '',
  tax: '',
  customFinalTotal: '',
  paymentMethod: 'CASH' as PaymentMethod,
  notes: '',

  setCustomer: (customer) => set({ customer }),
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(c => c.product.id === item.product.id);
    if (existing) {
      return { cart: state.cart.map(c => c.product.id === item.product.id ? { ...c, quantity: c.quantity + item.quantity } : c) };
    }
    return { cart: [...state.cart, item] };
  }),
  updateQuantity: (productId, quantity) => set((state) => ({
    cart: quantity <= 0
      ? state.cart.filter(c => c.product.id !== productId)
      : state.cart.map(c => c.product.id === productId ? { ...c, quantity } : c),
  })),
  removeFromCart: (productId) => set((state) => ({ cart: state.cart.filter(c => c.product.id !== productId) })),
  setDiscount: (discount) => set({ discount, customFinalTotal: '' }),
  setAdjustment: (adjustment) => set({ adjustment, customFinalTotal: '' }),
  setTax: (tax) => set({ tax, customFinalTotal: '' }),
  setCustomFinalTotal: (customFinalTotal) => set({ customFinalTotal }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),
  clearBill: () => set({ customer: null, cart: [], discount: '', adjustment: '', tax: '', customFinalTotal: '', notes: '' }),

  discountNum: () => toNum(get().discount),
  adjustmentNum: () => toNum(get().adjustment),
  taxNum: () => toNum(get().tax),
  customFinalTotalNum: () => get().customFinalTotal !== '' ? toNum(get().customFinalTotal) : undefined,

  subtotal: () => get().cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0),
  calculatedTotal: () => {
    const s = get();
    return s.subtotal() - toNum(s.discount) + toNum(s.tax) + toNum(s.adjustment);
  },
  finalTotal: () => {
    const s = get();
    return s.customFinalTotal !== '' ? toNum(s.customFinalTotal) : s.calculatedTotal();
  },
}));
