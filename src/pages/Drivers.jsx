import { useState } from 'react';
import { CheckCircle2, UserPlus, Truck } from 'lucide-react';
import api, { data } from '../lib/api.js';
import { Badge, Button, Card, ErrorBox, PageHeader, Spinner, useFetch, useToast } from '../components/ui.jsx';

export default function Drivers() {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phoneNumber: '', vehicleType: '', vehiclePlate: '' });
  const { data: drivers, loading, error, reload } = useFetch(() => api.get('/admin/deliveries/drivers').then(data), []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/deliveries/drivers', form);
      toast.success('Driver account created. Approve it when ready.');
      setForm({ email: '', password: '', fullName: '', phoneNumber: '', vehicleType: '', vehiclePlate: '' });
      setShowForm(false);
      reload();
    } catch (err) { toast.error(err.message || 'Could not create driver'); }
    finally { setSaving(false); }
  };

  const approve = async (driver, approved) => {
    try {
      await api.patch(`/admin/deliveries/drivers/${driver.userId}/approval`, null, { params: { approved } });
      toast.success(approved ? 'Driver approved' : 'Driver approval revoked');
      reload();
    } catch (err) { toast.error(err.message || 'Could not update approval'); }
  };

  const field = (key, label, type = 'text') => (
    <label className="block text-sm"><span className="mb-1 block text-muted">{label}</span>
      <input required={['email','password','fullName'].includes(key)} type={type} value={form[key]}
        onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))}
        className="w-full rounded-lg border border-line bg-white px-3 py-2" />
    </label>
  );

  return <>
    <PageHeader title="Delivery drivers" subtitle="Create driver accounts and approve them before they can sign in."
      action={<Button onClick={() => setShowForm((v) => !v)}><UserPlus className="mr-2 size-4" />{showForm ? 'Close form' : 'Add driver'}</Button>} />
    {showForm && <Card className="mb-5 p-5">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field('fullName','Full name')}{field('email','Email','email')}{field('password','Temporary password','password')}
        {field('phoneNumber','Phone number')}{field('vehicleType','Vehicle type')}{field('vehiclePlate','Vehicle plate')}
        <div className="sm:col-span-2 lg:col-span-3"><Button disabled={saving}>{saving ? 'Creating…' : 'Create driver account'}</Button></div>
      </form>
    </Card>}
    <Card className="overflow-hidden">
      {loading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : !drivers?.length ?
        <div className="p-10 text-center text-muted"><Truck className="mx-auto mb-2 size-8" />No driver accounts yet.</div> :
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="border-b border-line bg-paper/60"><tr className="text-left"><th className="p-3">Driver</th><th className="p-3">Contact</th><th className="p-3">Vehicle</th><th className="p-3">Approval</th><th className="p-3">Availability</th><th className="p-3 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-line">{drivers.map((d) => <tr key={d.userId}>
            <td className="p-3"><div className="font-medium">{d.fullName || d.email}</div><div className="text-xs text-muted">{d.email}</div></td>
            <td className="p-3">{d.phoneNumber || '—'}</td><td className="p-3">{[d.vehicleType,d.vehiclePlate].filter(Boolean).join(' · ') || '—'}</td>
            <td className="p-3"><Badge kind={d.approved ? 'purchased' : 'processing'}>{d.approved ? 'Approved' : 'Pending'}</Badge></td>
            <td className="p-3">{d.available ? 'Available' : 'Unavailable'}</td>
            <td className="p-3 text-right"><Button size="sm" variant="secondary" onClick={() => approve(d,!d.approved)}><CheckCircle2 className="mr-1 size-4" />{d.approved ? 'Revoke' : 'Approve'}</Button></td>
          </tr>)}</tbody>
        </table></div>}
    </Card>
  </>;
}
