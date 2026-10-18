import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, XCircle, X } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');
export const money = (n) => `$${Number(n || 0).toFixed(2)}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/* ---------- Buttons & inputs ---------- */
const variants = {
  primary: 'bg-pine text-white hover:bg-pine-2',
  accent: 'bg-saffron text-ink hover:brightness-95',
  outline: 'border border-line bg-white text-ink hover:bg-paper',
  ghost: 'text-muted hover:bg-black/5 hover:text-ink',
  danger: 'bg-chili text-white hover:brightness-95',
};
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...p }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        variants[variant], className
      )}
      {...p}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm placeholder:text-muted/70 focus:border-pine-3 focus:outline-none focus:ring-2 focus:ring-pine-3/20 disabled:bg-paper';

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-chili">{error}</span>}
    </label>
  );
}

/* ---------- Status badge ---------- */
const badge = {
  processing: 'bg-amber-100 text-amber-800',
  purchased: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-zinc-200 text-zinc-700',
};
export const Badge = ({ kind, children }) => (
  <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', badge[kind] || 'bg-zinc-100 text-zinc-700')}>{children ?? kind}</span>
);

/* ---------- Modal & confirm ---------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('w-full rounded-2xl bg-white shadow-xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-paper"><X className="size-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy} onClick={run}>{confirmLabel}</Button></>}>
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, kind, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  const api = { success: (t) => push('ok', t), error: (t) => push('err', t) };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-white p-3.5 text-sm shadow-lg">
            {t.kind === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-chili" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Page chrome ---------- */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const Card = ({ className, children }) => (
  <div className={cx('rounded-2xl border border-line bg-white', className)}>{children}</div>
);

export const Spinner = () => (
  <div className="flex items-center justify-center py-16 text-muted"><Loader2 className="size-6 animate-spin" /></div>
);

export const Empty = ({ title, hint, action }) => (
  <div className="flex flex-col items-center gap-2 py-16 text-center">
    <p className="font-display text-lg font-bold">{title}</p>
    {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
    {action}
  </div>
);

export const ErrorBox = ({ error, onRetry }) => (
  <div className="flex flex-col items-center gap-3 py-16 text-center">
    <p className="font-medium text-chili">{error.message}</p>
    {onRetry && <Button variant="outline" onClick={onRetry}>Try again</Button>}
  </div>
);

export function Pagination({ page, totalPages, totalElements, size, onPage }) {
  if (!totalElements) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, totalElements);
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
      <span>{from}–{to} of {totalElements}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <span className="px-2">Page {page} of {totalPages}</span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}

export const Th = ({ children, className }) => <th className={cx('px-4 py-3 text-left text-xs font-medium text-muted', className)}>{children}</th>;
export const Td = ({ children, className }) => <td className={cx('px-4 py-3 align-middle', className)}>{children}</td>;

/* ---------- Data hook ---------- */
export function useFetch(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((d) => live && setState({ data: d, loading: false, error: null }))
      .catch((e) => live && setState((s) => ({ ...s, loading: false, error: e })));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1), setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
