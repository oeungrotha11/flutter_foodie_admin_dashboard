import { useState } from 'react';
import { Pencil } from 'lucide-react';
import api, { data, paged } from '../lib/api.js';
import { Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Pagination, Spinner, Td, Th, cx, inputCls, useFetch, useToast } from '../components/ui.jsx';

const SIZE = 10;

export default function Customers() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const { data: res, loading, error, reload } = useFetch(() => api.get('/customers', { params: { page, size: SIZE } }).then(paged), [page]);

  return (
    <>
      <PageHeader title="Customers" subtitle="Customers sign up from the app. You can correct their name, phone and address here." />
      <Card className="overflow-hidden">
        {loading && !res ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : res.payload.length === 0 ? <Empty title="No customers yet" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-paper/60"><tr><Th>ID</Th><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Address</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody className={cx('divide-y divide-line', loading && 'opacity-60')}>
                  {res.payload.map((c) => (
                    <tr key={c.customerId}>
                      <Td className="text-muted">#{c.customerId}</Td>
                      <Td className="font-medium">{c.customerName}</Td>
                      <Td>{c.email}</Td>
                      <Td>{c.phoneNumber || '—'}</Td>
                      <Td className="max-w-xs truncate">{c.address || '—'}</Td>
                      <Td className="text-right"><Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(c)}><Pencil className="size-4" /></Button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={res.page} totalPages={res.totalPages} totalElements={res.totalElements} size={SIZE} onPage={setPage} />
          </>
        )}
      </Card>
      {editing && <CustomerForm customer={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} toast={toast} />}
    </>
  );
}

function CustomerForm({ customer, onClose, onSaved, toast }) {
  const [f, setF] = useState({ customerName: customer.customerName || '', phoneNumber: customer.phoneNumber || '', address: customer.address || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErrors({});
    try { await api.put(`/customers/${customer.customerId}`, f); toast.success('Customer updated'); onSaved(); }
    catch (e) { setErrors(e.details || {}); toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Edit customer"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>Save changes</Button></>}>
      <div className="space-y-4">
        <Field label="Email" hint="Login email can't be changed here."><input className={inputCls} value={customer.email || ''} disabled /></Field>
        <Field label="Name" error={errors.customerName}><input className={inputCls} value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} /></Field>
        <Field label="Phone" error={errors.phoneNumber}><input className={inputCls} value={f.phoneNumber} onChange={(e) => setF({ ...f, phoneNumber: e.target.value })} /></Field>
        <Field label="Address" error={errors.address}><textarea rows={2} className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
