import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageLoader } from '../components/ui/Loading';
import { useAuthStore } from '../stores/auth.store';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { admin } = useAuthStore();

  // Shop settings form
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [loaded, setLoaded] = useState(false);

  // Change password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data.data),
    onSuccess: (data: any) => { if (!loaded) { setForm(data); setLoaded(true); } },
  } as any);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Settings saved successfully'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword(pwForm),
    onSuccess: () => {
      toast.success('Password updated successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setPwErrors({});
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update password';
      toast.error(msg);
      if (msg.toLowerCase().includes('current')) setPwErrors(p => ({ ...p, current_password: msg }));
    },
  });

  const set = (key: string, value: string | number) => setForm(p => ({ ...p, [key]: value }));
  const setPw = (key: string, value: string) => { setPwForm(p => ({ ...p, [key]: value })); setPwErrors(p => ({ ...p, [key]: '' })); };

  const validatePassword = () => {
    const e: Record<string, string> = {};
    if (!pwForm.current_password) e.current_password = 'Current password is required';
    if (!pwForm.new_password || pwForm.new_password.length < 6) e.new_password = 'New password must be at least 6 characters';
    if (!pwForm.confirm_password) e.confirm_password = 'Please confirm your new password';
    else if (pwForm.new_password !== pwForm.confirm_password) e.confirm_password = 'Passwords do not match';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = () => {
    if (validatePassword()) changePwMutation.mutate();
  };

  const passwordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '', width: '0%' };
    if (pwd.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
    const score = [/[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)].filter(Boolean).length;
    if (pwd.length < 8) return { label: 'Weak', color: 'bg-orange-500', width: '40%' };
    if (score === 0) return { label: 'Fair', color: 'bg-yellow-500', width: '55%' };
    if (score === 1) return { label: 'Good', color: 'bg-blue-500', width: '70%' };
    if (score === 2) return { label: 'Strong', color: 'bg-emerald-500', width: '85%' };
    return { label: 'Very Strong', color: 'bg-emerald-600', width: '100%' };
  };

  const strength = passwordStrength(pwForm.new_password);

  if (isLoading) return <PageLoader />;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Shop Information */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Shop Information</h2>
        <Input label="Shop Name" value={String(form.shop_name || '')} onChange={e => set('shop_name', e.target.value)} />
        <Input label="Address" value={String(form.address || '')} onChange={e => set('address', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" value={String(form.phone || '')} onChange={e => set('phone', e.target.value)} />
          <Input label="Email" value={String(form.email || '')} onChange={e => set('email', e.target.value)} />
        </div>
        <Input label="GSTIN" value={String(form.gstin || '')} onChange={e => set('gstin', e.target.value)} />
        <Input label="Logo URL" value={String(form.logo_url || '')} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
      </div>

      {/* Invoice Settings */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Invoice Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Invoice Prefix" value={String(form.invoice_prefix || 'INV')} onChange={e => set('invoice_prefix', e.target.value)} placeholder="INV" />
          <Input label="Currency" value={String(form.currency || 'INR')} onChange={e => set('currency', e.target.value)} placeholder="INR" />
        </div>
        <Input label="Tax %" type="number" value={Number(form.tax_percentage || 0)} onChange={e => set('tax_percentage', parseFloat(e.target.value) || 0)} />
        <div>
          <label className="label">Invoice Footer Message</label>
          <textarea className="input" rows={3} value={String(form.invoice_footer || '')}
            onChange={e => set('invoice_footer', e.target.value)}
            placeholder="Thank you for shopping with us!" />
        </div>
      </div>

      <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="w-full py-3">
        Save Settings
      </Button>

      {/* Change Password */}
      <div className="card p-6 space-y-5">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="font-semibold text-gray-900">Change Password</h2>
          <p className="text-sm text-gray-500 mt-0.5">Logged in as <span className="font-medium text-gray-700">{admin?.email}</span></p>
        </div>

        {/* Current Password */}
        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showCurrent ? 'text' : 'password'}
              value={pwForm.current_password}
              onChange={e => setPw('current_password', e.target.value)}
              className={`input pl-9 pr-10 ${pwErrors.current_password ? 'border-red-500' : ''}`}
              placeholder="Enter current password"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwErrors.current_password && <p className="mt-1 text-xs text-red-600">{pwErrors.current_password}</p>}
        </div>

        {/* New Password */}
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showNew ? 'text' : 'password'}
              value={pwForm.new_password}
              onChange={e => setPw('new_password', e.target.value)}
              className={`input pl-9 pr-10 ${pwErrors.new_password ? 'border-red-500' : ''}`}
              placeholder="Min. 6 characters"
            />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pwForm.new_password && (
            <div className="mt-2">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
              </div>
              <p className={`text-xs mt-1 font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
            </div>
          )}
          {pwErrors.new_password && <p className="mt-1 text-xs text-red-600">{pwErrors.new_password}</p>}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="label">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={pwForm.confirm_password}
              onChange={e => setPw('confirm_password', e.target.value)}
              className={`input pl-9 pr-10 ${pwErrors.confirm_password ? 'border-red-500' : pwForm.confirm_password && pwForm.confirm_password === pwForm.new_password ? 'border-emerald-500' : ''}`}
              placeholder="Re-enter new password"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {pwForm.confirm_password && pwForm.confirm_password === pwForm.new_password && (
              <CheckCircle className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            )}
          </div>
          {pwErrors.confirm_password && <p className="mt-1 text-xs text-red-600">{pwErrors.confirm_password}</p>}
        </div>

        <Button
          loading={changePwMutation.isPending}
          onClick={handleChangePassword}
          icon={<Lock className="w-4 h-4" />}
          className="w-full py-2.5"
        >
          Update Password
        </Button>
      </div>
    </div>
  );
}
