import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { settingsApi } from '../../api';
import { formatDateTime } from '../../utils';
import { PageLoader } from '../../components/ui/Loading';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import InvoicePrint from '../billing/InvoicePrint';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.get(id!).then(r => r.data.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data.data),
  });

  const handlePrint = useReactToPrint({ contentRef: printRef });

  if (isLoading) return <PageLoader />;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/invoices" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">{formatDateTime(invoice.created_at)}</p>
              <span className={invoice.status === 'PAID' ? 'badge-green' : invoice.status === 'UNPAID' ? 'badge-yellow' : 'badge-red'}>{invoice.status}</span>
            </div>
          </div>
        </div>
        <button onClick={() => handlePrint()} className="btn-secondary">
          <Printer className="w-4 h-4" />
          Print Invoice
        </button>
      </div>

      {/* Hidden print target */}
      <div className="hidden">
        <InvoicePrint ref={printRef} invoice={invoice} settings={settings} />
      </div>

      {/* Visible preview */}
      <div className="card">
        <InvoicePrint invoice={invoice} settings={settings} />
      </div>
    </div>
  );
}
