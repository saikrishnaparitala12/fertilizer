import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { StatCard } from '../components/ui/Card';
import { PageLoader } from '../components/ui/Loading';
import { formatCurrency, formatDateTime } from '../utils';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  XCircle, Users, DollarSign
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: chartData } = useQuery({
    queryKey: ['sales-chart', 'week'],
    queryFn: () => dashboardApi.salesChart('week').then(r => r.data.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => dashboardApi.topProducts().then(r => r.data.data),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['recent-sales'],
    queryFn: () => dashboardApi.recentSales().then(r => r.data.data),
  });

  if (isLoading) return <PageLoader />;

  // Process chart data
  const processedChart = (() => {
    if (!chartData) return [];
    const grouped: Record<string, number> = {};
    (chartData as any[]).forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      grouped[date] = (grouped[date] || 0) + item.final_total;
    });
    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link to="/billing" className="btn-primary">
          <ShoppingCart className="w-4 h-4" />
          New Bill
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={formatCurrency(summary?.today_revenue || 0)} icon={<TrendingUp className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" />
        <StatCard title="Today's Orders" value={summary?.today_orders || 0} icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Total Revenue" value={formatCurrency(summary?.total_revenue || 0)} icon={<DollarSign className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />
        <StatCard title="Total Customers" value={summary?.total_customers || 0} icon={<Users className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Products" value={summary?.total_products || 0} icon={<Package className="w-5 h-5 text-gray-600" />} color="bg-gray-100" />
        <StatCard title="Low Stock" value={summary?.low_stock_products || 0} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} color="bg-amber-50" subtitle="Needs restock" />
        <StatCard title="Out of Stock" value={summary?.out_of_stock_products || 0} icon={<XCircle className="w-5 h-5 text-red-600" />} color="bg-red-50" subtitle="Unavailable" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Sales This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={processedChart}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${v}`} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(topProducts as any[] || []).slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
              <YAxis type="category" dataKey="product_name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v))} />
              <Bar dataKey="total_revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Recent Sales</h3>
          <Link to="/invoices" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all</Link>
        </div>
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
              {(recentSales as any[] || []).map((sale: any) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${sale.id}`} className="text-indigo-600 hover:underline font-medium">{sale.invoice_number}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{sale.customers?.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(sale.final_total)}</td>
                  <td className="px-4 py-3">
                    <span className="badge-blue">{sale.payment_method}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(sale.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
