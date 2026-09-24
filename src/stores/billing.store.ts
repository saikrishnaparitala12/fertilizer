import { create } from 'zustand';
import type { CartItem, Customer, PaymentMethod } from '../types';

interface BillingState {
  customer: Customer | null;
  cart: CartItem[];
  discount: number;
  adjustment: number;
  tax: number;
  customFinalTotal: number | undefined;
  paymentMethod: PaymentMethod;
  notes: string;
  setCustomer: (customer: Customer | null) => void;
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  setDiscount: (v: number) => void;
  setAdjustment: (v: number) => void;
  setTax: (v: number) => void;
  setCustomFinalTotal: (v: number | undefined) => void;
  setPaymentMethod: (v: PaymentMethod) => void;
  setNotes: (v: string) => void;
  clearBill: () => void;
  subtotal: () => number;
  calculatedTotal: () => number;
  finalTotal: () => number;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  customer: null,
  cart: [],
  discount: 0,
  adjustment: 0,
  tax: 0,
  customFinalTotal: undefined,
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
  setDiscount: (discount) => set({ discount, customFinalTotal: undefined }),
  setAdjustment: (adjustment) => set({ adjustment, customFinalTotal: undefined }),
  setTax: (tax) => set({ tax, customFinalTotal: undefined }),
  setCustomFinalTotal: (customFinalTotal) => set({ customFinalTotal }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),
  clearBill: () => set({ customer: null, cart: [], discount: 0, adjustment: 0, tax: 0, customFinalTotal: undefined, notes: '' }),

  subtotal: () => get().cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0),
  calculatedTotal: () => {
    const { discount, adjustment, tax } = get();
    return get().subtotal() - discount + tax + adjustment;
  },
  finalTotal: () => get().customFinalTotal ?? get().calculatedTotal(),
}));
