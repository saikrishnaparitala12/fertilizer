import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Pagination } from '../../components/ui/Table';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { formatCurrency, formatDate, debounce } from '../../utils';
import type { Customer } from '../../types';
import { Plus, Search, Edit, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const emptyForm = { name: '', phone: '', email: '', address: '', gstin: '', notes: '' };

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();

  const debouncedSet = useCallback(debounce((v: unknown) => { setDebouncedSearch(v as string); setPage(1); }, 300), []);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, debouncedSearch],
    queryFn: () => customersApi.list({ page, limit: 20, search: debouncedSearch }).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (d: typeof form) => editCustomer ? customersApi.update(editCustomer.id, d) : customersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowForm(false); toast.success(editCustomer ? 'Customer updated' : 'Customer created'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save customer'),
  });

  const openEdit = (c: Customer) => { setEditCustomer(c); setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '', gstin: c.gstin || '', notes: c.notes || '' }); setShowForm(true); };
  const openNew = () => { setEditCustomer(null); setForm(emptyForm); setShowForm(true); };

  const columns = [
    { key: 'name', header: 'Customer', render: (c: Customer) => (
      <div>
        <p className="font-medium text-gray-900">{c.name}</p>
        <p className="text-xs text-gray-400">{c.phone}</p>
      </div>
    )},
    { key: 'email', header: 'Email', render: (c: Customer) => <span className="text-gray-600">{c.email || '—'}</span> },
    { key: 'total_purchases', header: 'Purchases', render: (c: Customer) => <span className="font-semibold">{c.total_purchases}</span> },
    { key: 'total_amount_spent', header: 'Total Spent', render: (c: Customer) => <span className="font-semibold text-indigo-600">{formatCurrency(c.total_amount_spent)}</span> },
    { key: 'created_at', header: 'Since', render: (c: Customer) => <span className="text-gray-500">{formatDate(c.created_at)}</span> },
    { key: 'actions', header: '', render: (c: Customer) => (
      <div className="flex items-center gap-1">
        <Link to={`/customers/${c.id}`} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600">
          <Eye className="w-4 h-4" />
        </Link>
        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
          <Edit className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>Add Customer</Button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search by name or phone..." value={search}
              onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); }} />
          </div>
        </div>
        <Table columns={columns} data={data?.data || []} keyField="id" loading={isLoading} emptyMessage="No customers found" />
        <Pagination page={page} total={data?.meta?.total || 0} limit={20} onChange={setPage} />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editCustomer ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
              {editCustomer ? 'Update' : 'Create'} Customer
            </Button>
          </>
        }>
        <div className="space-y-4">
          <Input label="Full Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Phone *" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <Input label="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          <Input label="GSTIN" value={form.gstin} onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))} />
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
