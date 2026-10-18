import { useState } from 'react';
import { Eye, Gift, Pencil, Plus } from 'lucide-react';
import api, { data } from '../lib/api.js';
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, Td, Th, inputCls, money, useFetch, useToast } from '../components/ui.jsx';

const blank = {
  name: '',
  description: '',
  minimumQualifyingSubtotal: '20.00',
  discountRate: '0.10',
  minimumRedemptionSubtotal: '15.00',
  validityDays: '30',
};

const pct = (value) => `${(Number(value || 0) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

export default function RewardRules() {
  const toast = useToast();
  const { data: rawRules, loading, error, reload } = useFetch(() => api.get('/reward-rules').then(data), []);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // The admin endpoint intentionally returns inactive rules too.
  const rules = Array.isArray(rawRules) ? rawRules : [];

  const toggle = async (rule) => {
    const action = rule.active ? 'deactivate' : 'activate';
    try {
      await api.patch(`/reward-rules/${rule.rewardRuleId ?? rule.id}/${action}`);
      toast.success(`${rule.name} ${rule.active ? 'deactivated' : 'activated'}`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openDetails = async (rule) => {
    try {
      const result = data(await api.get(`/reward-rules/${rule.rewardRuleId ?? rule.id}`));
      setViewing(result);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Reward Rules"
        subtitle="Configure how customers earn rewards. These rules are different from rewards already earned by individual customers."
        action={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Add reward rule</Button>}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted">Total rules</p>
          <p className="mt-1 font-display text-3xl font-bold">{rules.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Active rules</p>
          <p className="mt-1 font-display text-3xl font-bold">{rules.filter((r) => r.active).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted">Inactive rules</p>
          <p className="mt-1 font-display text-3xl font-bold">{rules.filter((r) => !r.active).length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {loading && !rawRules ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : rules.length === 0 ? (
          <Empty title="No reward rules yet" hint="Create a rule to define the order amount needed to earn a reward and the discount it provides." action={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Add reward rule</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-paper/60">
                <tr><Th>Rule</Th><Th>Qualifying order</Th><Th>Reward discount</Th><Th>Minimum redemption</Th><Th>Validity</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rules.map((rule) => (
                  <tr key={rule.rewardRuleId ?? rule.id}>
                    <Td>
                      <p className="font-medium">{rule.name}</p>
                      <p className="max-w-xs truncate text-xs text-muted">{rule.description || 'No description'}</p>
                    </Td>
                    <Td>{money(rule.minimumQualifyingSubtotal)}</Td>
                    <Td className="font-medium">{pct(rule.discountRate)}</Td>
                    <Td>{money(rule.minimumRedemptionSubtotal)}</Td>
                    <Td>{rule.validityDays} days</Td>
                    <Td><Badge kind={rule.active ? 'active' : 'inactive'}>{rule.active ? 'Active' : 'Inactive'}</Badge></Td>
                    <Td className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" aria-label="View reward rule" onClick={() => openDetails(rule)}><Eye className="size-4" /></Button>
                      <Button variant="ghost" size="sm" aria-label="Edit reward rule" onClick={() => setEditing(rule)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle(rule)}>{rule.active ? 'Deactivate' : 'Activate'}</Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <RewardRuleForm rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Reward rule details'}>
        {viewing && (
          <div className="space-y-4 text-sm">
            <p className="text-muted">{viewing.description || 'No description provided.'}</p>
            <Detail label="Minimum qualifying subtotal" value={money(viewing.minimumQualifyingSubtotal)} />
            <Detail label="Reward discount" value={pct(viewing.discountRate)} />
            <Detail label="Minimum redemption subtotal" value={money(viewing.minimumRedemptionSubtotal)} />
            <Detail label="Validity" value={`${viewing.validityDays} days`} />
            <Detail label="Status" value={viewing.active ? 'Active' : 'Inactive'} />
          </div>
        )}
      </Modal>
    </>
  );
}

function Detail({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-line pb-3"><span className="text-muted">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function RewardRuleForm({ rule, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(rule ? {
    name: rule.name || '',
    description: rule.description || '',
    minimumQualifyingSubtotal: String(rule.minimumQualifyingSubtotal ?? ''),
    discountRate: String(rule.discountRate ?? ''),
    minimumRedemptionSubtotal: String(rule.minimumRedemptionSubtotal ?? ''),
    validityDays: String(rule.validityDays ?? 30),
  } : blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    const localErrors = {};
    if (!form.name.trim()) localErrors.name = 'Name is required';
    if (form.minimumQualifyingSubtotal === '' || Number(form.minimumQualifyingSubtotal) < 0) localErrors.minimumQualifyingSubtotal = 'Enter an amount of 0 or more';
    if (form.discountRate === '' || Number(form.discountRate) <= 0 || Number(form.discountRate) > 1) localErrors.discountRate = 'Use a decimal greater than 0 and no more than 1 (e.g. 0.10 for 10%)';
    if (form.minimumRedemptionSubtotal === '' || Number(form.minimumRedemptionSubtotal) < 0) localErrors.minimumRedemptionSubtotal = 'Enter an amount of 0 or more';
    if (!Number.isInteger(Number(form.validityDays)) || Number(form.validityDays) < 1) localErrors.validityDays = 'Enter a whole number greater than 0';
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    // Do not send "active" on update: the API preserves the rule's current active state.
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      minimumQualifyingSubtotal: Number(form.minimumQualifyingSubtotal),
      discountRate: Number(form.discountRate),
      minimumRedemptionSubtotal: Number(form.minimumRedemptionSubtotal),
      validityDays: Number(form.validityDays),
    };
    setBusy(true);
    setErrors({});
    try {
      const id = rule?.rewardRuleId ?? rule?.id;
      if (rule) await api.put(`/reward-rules/${id}`, body);
      else await api.post('/reward-rules', body);
      toast.success(rule ? 'Reward rule updated' : 'Reward rule created');
      onSaved();
    } catch (e) {
      setErrors(e.details || {});
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={rule ? 'Edit reward rule' : 'Create reward rule'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>{rule ? 'Save changes' : 'Create rule'}</Button></>}>
      <div className="space-y-4">
        <Field label="Rule name" error={errors.name}><input className={inputCls} value={form.name} onChange={set('name')} placeholder="Spend $20, earn 10%" /></Field>
        <Field label="Description" error={errors.description} hint="Optional"><textarea rows={2} className={inputCls} value={form.description} onChange={set('description')} placeholder="Earn a discount after a qualifying order" /></Field>
        <Field label="Minimum qualifying subtotal (USD)" error={errors.minimumQualifyingSubtotal} hint="Order subtotal required to earn the reward."><input type="number" min="0" step="0.01" className={inputCls} value={form.minimumQualifyingSubtotal} onChange={set('minimumQualifyingSubtotal')} /></Field>
        <Field label="Discount rate (decimal)" error={errors.discountRate} hint="Enter 0.10 for 10%, or 0.25 for 25%."><input type="number" min="0.01" max="1" step="0.01" className={inputCls} value={form.discountRate} onChange={set('discountRate')} /></Field>
        <Field label="Minimum redemption subtotal (USD)" error={errors.minimumRedemptionSubtotal} hint="Minimum order subtotal to use the earned reward."><input type="number" min="0" step="0.01" className={inputCls} value={form.minimumRedemptionSubtotal} onChange={set('minimumRedemptionSubtotal')} /></Field>
        <Field label="Reward validity (days)" error={errors.validityDays}><input type="number" min="1" step="1" className={inputCls} value={form.validityDays} onChange={set('validityDays')} /></Field>
        {rule && <p className="text-xs text-muted">Current status is preserved when you update this rule. Use Activate/Deactivate in the list to change its status.</p>}
      </div>
    </Modal>
  );
}
