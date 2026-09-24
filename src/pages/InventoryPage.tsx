import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../api';
import { Table, Pagination } from '../components/ui/Table';
import { formatDateTime } from '../utils';
import type { InventoryTransaction } from '../types';

const TYPE_COLORS: Record<string, string> = {
  STOCK_IN: 'badge-green',
  SALE: 'badge-blue',
  RETURN: 'badge-yellow',
  DAMAGED: 'badge-red',
  STOCK_ADJUSTMENT: 'badge-gray',
  MANUAL_ADJUSTMENT: 'badge-gray',
};

export default function InventoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page],
    queryFn: () => inventoryApi.list({ page, limit: 30 }).then((r: any) => r.data),
  });

  const columns = [
    {
      key: 'created_at', header: 'Date',
      render: (t: InventoryTransaction) => <span className="text-gray-500 text-xs">{formatDateTime(t.created_at)}</span>,
    },
    {
      key: 'product', header: 'Product',
      render: (t: InventoryTransaction) => (
        <div>
          <p className="font-medium text-gray-900">{(t as any).products?.name}</p>
          <p className="text-xs text-gray-400">{(t as any).products?.sku}</p>
        </div>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: (t: InventoryTransaction) => (
        <span className={TYPE_COLORS[t.type] || 'badge-gray'}>{t.type.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'quantity', header: 'Qty',
      render: (t: InventoryTransaction) => (
        <span className={`font-bold ${['SALE', 'DAMAGED'].includes(t.type) ? 'text-red-600' : 'text-emerald-600'}`}>
          {['SALE', 'DAMAGED'].includes(t.type) ? '-' : '+'}{t.quantity}
        </span>
      ),
    },
    { key: 'stock_before', header: 'Before', render: (t: InventoryTransaction) => <span className="text-gray-600">{t.stock_before}</span> },
    { key: 'stock_after', header: 'After', render: (t: InventoryTransaction) => <span className="font-semibold">{t.stock_after}</span> },
    { key: 'reason', header: 'Reason', render: (t: InventoryTransaction) => <span className="text-gray-500 text-xs">{t.reason || '—'}</span> },
    { key: 'admin', header: 'By', render: (t: InventoryTransaction) => <span className="text-gray-600 text-xs">{(t as any).admins?.name}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory Transactions</h1>
      <div className="card">
        <Table columns={columns} data={data?.data || []} keyField="id" loading={isLoading} emptyMessage="No transactions found" />
        <Pagination page={page} total={data?.meta?.total || 0} limit={30} onChange={setPage} />
      </div>
    </div>
  );
}
