import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api';
import { formatCurrency, formatDate, getApiErrorMessage } from '../utils';
import { PageLoader } from '../components/ui/Loading';
import { Button } from '../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales' | 'inventory' | 'products'>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });

  const { data: salesData, isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['report-sales', appliedRange.from, appliedRange.to],
    queryFn: () => reportsApi.sales(Object.fromEntries(Object.entries(appliedRange).filter(([, value]) => value))).then(r => r.data.data),
    enabled: tab === 'sales',
  });

  const { data: inventoryData, isLoading: invLoading, error: inventoryError } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory().then(r => r.data.data),
    enabled: tab === 'inventory',
  });

  const { data: productData, isLoading: prodLoading, error: productError } = useQuery({
    queryKey: ['report-products', appliedRange.from, appliedRange.to],
    queryFn: () => reportsApi.productSales(Object.fromEntries(Object.entries(appliedRange).filter(([, value]) => value))).then(r => r.data.data),
    enabled: tab === 'products',
  });

  const tabs = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'inventory', label: 'Inventory Report' },
    { key: 'products', label: 'Product Sales' },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date filters */}
      {tab !== 'inventory' && (
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-40" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-40" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} />
          </div>
          <Button onClick={() => setAppliedRange({ from, to })} disabled={Boolean(from && to && from > to)}>Apply filters</Button>
          <Button variant="secondary" onClick={() => { setFrom(''); setTo(''); setAppliedRange({ from: '', to: '' }); }}>Clear</Button>
        </div>
      )}

      {(tab === 'sales' && salesError || tab === 'products' && productError) && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {getApiErrorMessage(tab === 'sales' ? salesError : productError)}
        </div>
      )}
      {tab === 'inventory' && inventoryError && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{getApiErrorMessage(inventoryError)}</div>
      )}
      {(tab === 'sales' && salesData?.invoices?.length === 0 || tab === 'products' && (productData as any[] | undefined)?.length === 0) && (appliedRange.from || appliedRange.to) && !salesLoading && !prodLoading && (
        <div className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">No sales matched the selected date range.</div>
      )}

      {/* Sales Report */}
      {tab === 'sales' && (
        salesLoading ? <PageLoader /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="card p-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold leading-tight text-indigo-600 tabular-nums [overflow-wrap:anywhere]">{salesData?.total_orders || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Paid Orders</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-xl sm:text-2xl font-bold leading-tight text-emerald-600 tabular-nums [overflow-wrap:anywhere]">{formatCurrency(salesData?.total_sales || 0)}</p>
                <p className="text-sm text-gray-500 mt-1">Paid Sales</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-xl sm:text-2xl font-bold leading-tight text-amber-600 tabular-nums [overflow-wrap:anywhere]">{formatCurrency(salesData?.outstanding_total || 0)}</p>
                <p className="text-sm text-gray-500 mt-1">Outstanding · {salesData?.unpaid_orders || 0} bills</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-xl sm:text-2xl font-bold leading-tight text-gray-900 tabular-nums [overflow-wrap:anywhere]">{formatCurrency(salesData?.avg_bill_value || 0)}</p>
                <p className="text-sm text-gray-500 mt-1">Avg. Bill Value</p>
              </div>
            </div>
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 font-semibold">Recent Invoices</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Invoice', 'Customer', 'Total', 'Payment', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(salesData?.invoices || []).slice(0, 20).map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-indigo-600">{inv.invoice_number}</td>
                        <td className="px-4 py-3">{inv.customers?.name}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">{formatCurrency(inv.final_total)}</td>
                        <td className="px-4 py-3"><span className={inv.status === 'UNPAID' ? 'badge-yellow' : 'badge-blue'}>{inv.status === 'UNPAID' ? 'Unpaid' : inv.payment_method}</span></td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(inv.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* Inventory Report */}
      {tab === 'inventory' && (
        invLoading ? <PageLoader /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="card p-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold leading-tight text-indigo-600 tabular-nums [overflow-wrap:anywhere]">{inventoryData?.total_products || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Total Products</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-xl sm:text-2xl font-bold leading-tight text-emerald-600 tabular-nums [overflow-wrap:anywhere]">{formatCurrency(inventoryData?.total_stock_value || 0)}</p>
                <p className="text-sm text-gray-500 mt-1">Stock Value</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold leading-tight text-red-600 tabular-nums [overflow-wrap:anywhere]">{inventoryData?.out_of_stock?.length || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Out of Stock</p>
              </div>
            </div>
            {(inventoryData?.low_stock || []).length > 0 && (
              <div className="card">
                <div className="px-6 py-4 border-b border-gray-200 font-semibold text-amber-600">⚠ Low Stock Products</div>
                <div className="divide-y divide-gray-50">
                  {inventoryData.low_stock.map((p: any) => (
                    <div key={p.id} className="px-6 py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-600">{p.current_stock} {p.unit}</p>
                        <p className="text-xs text-gray-400">Min: {p.min_stock_threshold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Product Sales */}
      {tab === 'products' && (
        prodLoading ? <PageLoader /> : (
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">Revenue by Product</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(productData as any[] || []).slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="product_name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
                  <Bar dataKey="total_revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200 font-semibold">Product Sales Breakdown</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Product', 'SKU', 'Qty Sold', 'Revenue'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(productData as any[] || []).map((p: any) => (
                      <tr key={p.product_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{p.product_name}</td>
                        <td className="px-4 py-3 text-gray-500">{p.product_sku}</td>
                        <td className="px-4 py-3 font-semibold">{p.total_quantity}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600 tabular-nums whitespace-nowrap">{formatCurrency(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
