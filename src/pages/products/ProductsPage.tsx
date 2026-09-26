import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, uploadProductImage, getProductImageUrl } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Table, Pagination } from '../../components/ui/Table';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { formatCurrency, getStockBadgeClass, getStockLabel, debounce } from '../../utils';
import type { Product } from '../../types';
import { ProductStatus, ProductUnit } from '../../types';
import { Plus, Search, Edit, Trash2, TrendingUp, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const UNITS = Object.values(ProductUnit);

const emptyForm = {
  sku: '', name: '', description: '', brand: '',
  unit: ProductUnit.PIECE, purchase_price: '', selling_price: '',
  current_stock: '0', min_stock_threshold: '10', image_url: '', status: ProductStatus.ACTIVE,
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({ quantity: 0, type: 'STOCK_IN', reason: '' });
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const debouncedSet = useCallback(debounce((v: unknown) => { setDebouncedSearch(v as string); setPage(1); }, 300), []);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, debouncedSearch],
    queryFn: () => productsApi.list({ page, limit: 20, search: debouncedSearch }).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: async (d: typeof form) => {
      let finalForm = {
        ...d,
        purchase_price: Number(d.purchase_price) || 0,
        selling_price: Number(d.selling_price) || 0,
        current_stock: Number.parseInt(d.current_stock, 10) || 0,
        min_stock_threshold: Number.parseInt(d.min_stock_threshold, 10) || 0,
      };
      if (imageFile) {
        setUploading(true);
        try {
          const path = await uploadProductImage(imageFile);
          finalForm = { ...finalForm, image_url: path };
        } finally {
          setUploading(false);
        }
      }
      return editProduct ? productsApi.update(editProduct.id, finalForm) : productsApi.create(finalForm);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowForm(false); toast.success(editProduct ? 'Product updated' : 'Product created'); },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || 'Failed to save product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setDeleteProduct(null); toast.success('Product deactivated'); },
  });

  const stockMutation = useMutation({
    mutationFn: () => productsApi.adjustStock({ product_id: stockProduct!.id, ...stockForm }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowStockModal(false); toast.success('Stock adjusted'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to adjust stock'),
  });

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ sku: p.sku, name: p.name, description: p.description || '', brand: p.brand || '', unit: p.unit, purchase_price: String(p.purchase_price), selling_price: String(p.selling_price), current_stock: String(p.current_stock), min_stock_threshold: String(p.min_stock_threshold), image_url: p.image_url || '', status: p.status });
    setImageFile(null);
    setImagePreview(p.image_url ? getProductImageUrl(p.image_url) : '');
    setShowForm(true);
  };
  const openNew = () => { setEditProduct(null); setForm(emptyForm); setImageFile(null); setImagePreview(''); setShowForm(true); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const columns = [
    {
      key: 'name', header: 'Product', render: (p: Product) => (
        <div className="flex items-center gap-3">
          {p.image_url ? (
            <img src={getProductImageUrl(p.image_url)} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ImagePlus className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{p.name}</p>
            <p className="text-xs text-gray-400">{p.sku}{p.brand && ` • ${p.brand}`}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (p: Product) => <span className="text-gray-600">{(p as any).categories?.name || '—'}</span> },
    { key: 'selling_price', header: 'Price', render: (p: Product) => <span className="font-semibold">{formatCurrency(p.selling_price)}</span> },
    {
      key: 'current_stock', header: 'Stock', render: (p: Product) => (
        <div>
          <span className="font-semibold">{p.current_stock} {p.unit}</span>
          <span className={`ml-2 ${getStockBadgeClass(p.current_stock, p.min_stock_threshold)}`}>{getStockLabel(p.current_stock, p.min_stock_threshold)}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (p: Product) => <span className={p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}>{p.status}</span> },
    {
      key: 'actions', header: '', render: (p: Product) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setStockProduct(p); setStockForm({ quantity: 0, type: 'STOCK_IN', reason: '' }); setShowStockModal(true); }} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600" title="Adjust Stock">
            <TrendingUp className="w-4 h-4" />
          </button>
          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteProduct(p)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>Add Product</Button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search products..." value={search}
              onChange={e => { setSearch(e.target.value); debouncedSet(e.target.value); }} />
          </div>
        </div>
        <Table columns={columns} data={data?.data || []} keyField="id" loading={isLoading} emptyMessage="No products found" />
        <Pagination page={page} total={data?.meta?.total || 0} limit={20} onChange={setPage} />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending || uploading} onClick={() => saveMutation.mutate(form)}>
              {editProduct ? 'Update' : 'Create'} Product
            </Button>
          </>
        }>
        <div className="grid grid-cols-2 gap-4">
          <Input label="SKU *" value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="PROD-001" />
          <Input label="Product Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Brand" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} />
          <Select label="Unit" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value as ProductUnit }))}
            options={UNITS.map(u => ({ value: u, label: u }))} />
          <Input label="Purchase Price (₹)" type="text" inputMode="decimal" value={form.purchase_price} onChange={e => setForm(p => ({ ...p, purchase_price: e.target.value }))} />
          <Input label="Selling Price (₹)" type="text" inputMode="decimal" value={form.selling_price} onChange={e => setForm(p => ({ ...p, selling_price: e.target.value }))} />
          {!editProduct && <Input label="Initial Stock" type="text" inputMode="numeric" value={form.current_stock} onChange={e => setForm(p => ({ ...p, current_stock: e.target.value }))} />}
          <Input label="Min Stock Threshold" type="text" inputMode="numeric" value={form.min_stock_threshold} onChange={e => setForm(p => ({ ...p, min_stock_threshold: e.target.value }))} />
          <div className="col-span-2">
            <span className="label">Product status</span>
            <div className="inline-flex w-full sm:w-auto rounded-md border border-gray-300 p-1 bg-gray-50" role="group" aria-label="Product status">
              {([ProductStatus.ACTIVE, ProductStatus.INACTIVE] as const).map(status => (
                <button key={status} type="button" aria-pressed={form.status === status}
                  onClick={() => setForm(p => ({ ...p, status }))}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded text-sm font-semibold transition-colors ${form.status === status ? status === ProductStatus.ACTIVE ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-700 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                  {status === ProductStatus.ACTIVE ? 'Active' : 'Inactive'}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          {/* Image Upload */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setForm(p => ({ ...p, image_url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors">
                <ImagePlus className="w-4 h-4" />
                Upload Image (max 2MB)
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title={`Adjust Stock: ${stockProduct?.name}`} size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cancel</Button>
            <Button loading={stockMutation.isPending} onClick={() => stockMutation.mutate()}>Adjust Stock</Button>
          </>
        }>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            Current Stock: <span className="font-bold">{stockProduct?.current_stock} {stockProduct?.unit}</span>
          </div>
          <Select label="Type" value={stockForm.type} onChange={e => setStockForm(p => ({ ...p, type: e.target.value }))}
            options={[
              { value: 'STOCK_IN', label: 'Stock In (+)' },
              { value: 'STOCK_ADJUSTMENT', label: 'Adjustment' },
              { value: 'DAMAGED', label: 'Damaged (-)' },
              { value: 'MANUAL_ADJUSTMENT', label: 'Manual Adjustment' },
            ]} />
          <Input label="Quantity (use negative for reduction)" type="number" value={stockForm.quantity}
            onChange={e => setStockForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
          <Input label="Reason" value={stockForm.reason} onChange={e => setStockForm(p => ({ ...p, reason: e.target.value }))} placeholder="Optional" />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteProduct} onClose={() => setDeleteProduct(null)}
        onConfirm={() => deleteProduct && deleteMutation.mutate(deleteProduct.id)}
        loading={deleteMutation.isPending}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${deleteProduct?.name}"? It will no longer appear in billing.`} />
    </div>
  );
}
