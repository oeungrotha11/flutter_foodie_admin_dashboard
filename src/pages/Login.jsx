import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { Button, Field, inputCls } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.details ? Object.values(err.details).join(' ') : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-pine p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-saffron text-ink"><UtensilsCrossed className="size-5" /></span>
          <span className="font-display text-2xl font-bold">Foodie</span>
        </div>
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05]">Run the kitchen,<br />not the spreadsheet.</h1>
          <p className="mt-5 max-w-md text-white/70">Orders, menu, promos and customers in one place.</p>
        </div>
        <p className="text-sm text-white/50">Foodie admin console</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use your admin account.</p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-chili">{error}</p>}
          <Field label="Email">
            <input className={inputCls} type="email" required autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" required minLength={8} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Button type="submit" loading={busy} className="w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
