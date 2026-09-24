import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { formatCurrency, formatDate, formatDateTime } from '../../utils';
import { PageLoader } from '../../components/ui/Loading';
import { ArrowLeft, Phone, Mail, MapPin } from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id!).then(r => r.data.data),
  });

  const { data: purchases } = useQuery({
    queryKey: ['customer-purchases', id],
    queryFn: () => customersApi.getPurchases(id!, { page: 1, limit: 20 }).then(r => r.data),
  });

  if (isLoading) return <PageLoader />;
  if (!customer) return <div className="p-6">Customer not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/customers" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-600">
              {customer.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold">{customer.name}</h2>
              <p className="text-gray-500 text-sm">Customer since {formatDate(customer.created_at)}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" />{customer.phone}</div>
            {customer.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" />{customer.email}</div>}
            {customer.address && <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4" />{customer.address}</div>}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-indigo-600">{customer.total_purchases}</p>
            <p className="text-sm text-gray-500 mt-1">Total Orders</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-emerald-600">{formatCurrency(customer.total_amount_spent)}</p>
            <p className="text-sm text-gray-500 mt-1">Total Spent</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {customer.total_purchases > 0 ? formatCurrency(customer.total_amount_spent / customer.total_purchases) : '₹0'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Avg. Order</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Purchase History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Invoice', 'Date', 'Items', 'Total', 'Payment', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(purchases?.data || []).map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${inv.id}`} className="text-indigo-600 hover:underline font-medium">{inv.invoice_number}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(inv.created_at)}</td>
                  <td className="px-4 py-3">{inv.invoice_items?.length || 0} items</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(inv.final_total)}</td>
                  <td className="px-4 py-3"><span className="badge-blue">{inv.payment_method}</span></td>
                  <td className="px-4 py-3">
                    <span className={inv.status === 'PAID' ? 'badge-green' : 'badge-red'}>{inv.status}</span>
                  </td>
                </tr>
              ))}
              {(!purchases?.data || purchases.data.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No purchases yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
