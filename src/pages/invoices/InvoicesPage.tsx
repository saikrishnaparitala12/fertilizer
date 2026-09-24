import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { Table, Pagination } from '../../components/ui/Table';
import { formatCurrency, formatDateTime } from '../../utils';
import type { Invoice } from '../../types';
import { Search, Eye, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [cancelInvoice, setCancelInvoice] = useState<Invoice | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, search],
    queryFn: () => invoicesApi.list({ page, limit: 20, search }).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); setCancelInvoice(null); toast.success('Invoice cancelled'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to cancel'),
  });

  const columns = [
    { key: 'invoice_number', header: 'Invoice', render: (i: Invoice) => (
      <Link to={`/invoices/${i.id}`} className="text-indigo-600 hover:underline font-semibold">{i.invoice_number}</Link>
    )},
    { key: 'customer', header: 'Customer', render: (i: Invoice) => (
      <div>
        <p className="font-medium">{(i as any).customers?.name}</p>
        <p className="text-xs text-gray-400">{(i as any).customers?.phone}</p>
      </div>
    )},
    { key: 'final_total', header: 'Total', render: (i: Invoice) => <span className="font-bold text-gray-900">{formatCurrency(i.final_total)}</span> },
    { key: 'payment_method', header: 'Payment', render: (i: Invoice) => <span className="badge-blue">{i.payment_method}</span> },
    { key: 'admin', header: 'By', render: (i: Invoice) => <span className="text-gray-600">{(i as any).admins?.name}</span> },
    { key: 'created_at', header: 'Date', render: (i: Invoice) => <span className="text-gray-500">{formatDateTime(i.created_at)}</span> },
    { key: 'status', header: 'Status', render: (i: Invoice) => <span className={i.status === 'PAID' ? 'badge-green' : 'badge-red'}>{i.status}</span> },
    { key: 'actions', header: '', render: (i: Invoice) => (
      <div className="flex items-center gap-1">
        <Link to={`/invoices/${i.id}`} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600">
          <Eye className="w-4 h-4" />
        </Link>
        {i.status === 'PAID' && (
          <button onClick={() => setCancelInvoice(i)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search invoice number..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table columns={columns} data={data?.data || []} keyField="id" loading={isLoading} emptyMessage="No invoices found" />
        <Pagination page={page} total={data?.meta?.total || 0} limit={20} onChange={setPage} />
      </div>

      <ConfirmDialog open={!!cancelInvoice} onClose={() => setCancelInvoice(null)}
        onConfirm={() => cancelInvoice && cancelMutation.mutate(cancelInvoice.id)}
        loading={cancelMutation.isPending}
        title="Cancel Invoice"
        message={`Cancel invoice ${cancelInvoice?.invoice_number}? Stock will be restored automatically.`} />
    </div>
  );
}
