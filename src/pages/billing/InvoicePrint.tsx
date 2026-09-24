import { forwardRef } from 'react';
import { formatCurrency, formatDateTime } from '../../utils';
import type { Invoice } from '../../types';

interface InvoicePrintProps { invoice: Invoice; settings?: any }

const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>(({ invoice, settings }, ref) => {
  return (
    <div ref={ref} className="p-8 max-w-2xl mx-auto font-sans text-gray-900 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">{settings?.shop_name || 'My Shop'}</h1>
          {settings?.address && <p className="text-sm text-gray-500 mt-1">{settings.address}</p>}
          {settings?.phone && <p className="text-sm text-gray-500">{settings.phone}</p>}
          {settings?.email && <p className="text-sm text-gray-500">{settings.email}</p>}
          {settings?.gstin && <p className="text-sm text-gray-500">GSTIN: {settings.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">INVOICE</p>
          <p className="text-indigo-600 font-semibold mt-1">{invoice.invoice_number}</p>
          <p className="text-sm text-gray-500 mt-1">{formatDateTime(invoice.created_at)}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {invoice.status}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bill To</p>
        <p className="font-semibold text-gray-900">{invoice.customers?.name}</p>
        <p className="text-sm text-gray-600">{invoice.customers?.phone}</p>
        {invoice.customers?.address && <p className="text-sm text-gray-600">{invoice.customers.address}</p>}
      </div>

      {/* Items */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Product</th>
            <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">SKU</th>
            <th className="text-center py-2 text-xs font-semibold text-gray-500 uppercase">Qty</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.invoice_items?.map(item => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-3 text-sm font-medium">{item.product_name}</td>
              <td className="py-3 text-sm text-center text-gray-500">{item.product_sku}</td>
              <td className="py-3 text-sm text-center">{item.quantity} {item.unit}</td>
              <td className="py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
              <td className="py-3 text-sm text-right font-semibold">{formatCurrency(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span><span>-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          {invoice.adjustment !== 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>Adjustment</span>
              <span>{invoice.adjustment > 0 ? '+' : ''}{formatCurrency(invoice.adjustment)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span><span>{formatCurrency(invoice.tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t-2 border-gray-900 pt-2">
            <span>Total</span><span className="text-indigo-700">{formatCurrency(invoice.final_total)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Payment</span><span className="font-medium">{invoice.payment_method}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      {settings?.invoice_footer && (
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
          {settings.invoice_footer}
        </div>
      )}

      <div className="mt-4 text-center text-xs text-gray-400">
        Generated by {(invoice as any).admins?.name} • {formatDateTime(invoice.created_at)}
      </div>
    </div>
  );
});

InvoicePrint.displayName = 'InvoicePrint';
export default InvoicePrint;
