import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import api, { data } from '../lib/api.js';
import { Badge, Button, Card, ConfirmDialog, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, Td, Th, fmtDate, inputCls, money, useFetch, useToast } from '../components/ui.jsx';

const pct = (r) => `${+(r * 100).toFixed(1)}%`;
const toInput = (d) => (d ? d.slice(0, 16) : '');
const toApi = (v) => (v ? (v.length === 16 ? `${v}:00` : v) : null);

export default function Promos() {
  const toast = useToast();
  const { data: list, loading, error, reload } = useFetch(() => api.get('/promos').then(data), []);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);

  const toggle = async (p) => {
    try { await api.patch(`/promos/${p.promoId}/${p.active ? 'deactivate' : 'activate'}`); toast.success(`${p.code} ${p.active ? 'deactivated' : 'activated'}`); reload(); }
    catch (e) { toast.error(e.message); }
  };
  const remove = async () => {
    try { await api.delete(`/promos/${del.promoId}`); toast.success(`${del.code} deleted`); reload(); }
    catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <>
      <PageHeader title="Promos" subtitle="Discount codes customers can apply at checkout."
        action={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Add promo</Button>} />
      <Card className="overflow-hidden">
        {loading && !list ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : list.length === 0 ? (
          <Empty title="No promos yet" hint="Create a code like WELCOME10 to start." action={<Button onClick={() => setEditing('new')}>Add promo</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-paper/60"><tr><Th>Code</Th><Th>Discount</Th><Th>Min. order</Th><Th>Runs</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
              <tbody className="divide-y divide-line">
                {list.map((p) => (
                  <tr key={p.promoId}>
                    <Td><p className="font-mono font-medium">{p.code}</p><p className="text-xs text-muted">{p.description}</p></Td>
                    <Td className="font-medium">{pct(p.discountRate)}</Td>
                    <Td>{money(p.minimumSubtotal)}</Td>
                    <Td className="whitespace-nowrap text-xs text-muted">{p.startAt || p.endAt ? `${p.startAt ? fmtDate(p.startAt) : 'Anytime'} → ${p.endAt ? fmtDate(p.endAt) : 'No end'}` : 'Always'}</Td>
                    <Td><Badge kind={p.active ? 'active' : 'inactive'}>{p.active ? 'Active' : 'Inactive'}</Badge></Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" onClick={() => toggle(p)}>{p.active ? 'Deactivate' : 'Activate'}</Button>
                      <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && <PromoForm promo={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete promo?" message={del && `Code ${del.code} will stop working immediately.`} onConfirm={remove} />
    </>
  );
}

function PromoForm({ promo, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    code: promo?.code || '', description: promo?.description || '',
    percent: promo ? +(promo.discountRate * 100).toFixed(1) : 10,
    minimumSubtotal: promo?.minimumSubtotal ?? 0, startAt: toInput(promo?.startAt), endAt: toInput(promo?.endAt),
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setBusy(true); setErrors({});
    const body = {
      code: f.code.trim(), description: f.description,
      discountRate: Math.round(Number(f.percent) * 100) / 10000, // percent -> 0.01..1.00
      minimumSubtotal: Number(f.minimumSubtotal), startAt: toApi(f.startAt), endAt: toApi(f.endAt),
    };
    try {
      promo ? await api.put(`/promos/${promo.promoId}`, body) : await api.post('/promos', body);
      toast.success(promo ? 'Promo updated' : 'Promo created'); onSaved();
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={promo ? 'Edit promo' : 'Add promo'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>{promo ? 'Save changes' : 'Create promo'}</Button></>}>
      <div className="space-y-4">
        <Field label="Code" error={errors.code} hint="Letters, numbers, _ and - only."><input className={inputCls} value={f.code} onChange={set('code')} /></Field>
        <Field label="Description" error={errors.description}><input className={inputCls} value={f.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Discount (%)" error={errors.discountRate}><input type="number" min="1" max="100" step="0.5" className={inputCls} value={f.percent} onChange={set('percent')} /></Field>
          <Field label="Minimum order (USD)" error={errors.minimumSubtotal}><input type="number" min="0" step="0.01" className={inputCls} value={f.minimumSubtotal} onChange={set('minimumSubtotal')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts" error={errors.startAt} hint="Optional"><input type="datetime-local" className={inputCls} value={f.startAt} onChange={set('startAt')} /></Field>
          <Field label="Ends" error={errors.endAt} hint="Optional"><input type="datetime-local" className={inputCls} value={f.endAt} onChange={set('endAt')} /></Field>
        </div>
      </div>
    </Modal>
  );
}
