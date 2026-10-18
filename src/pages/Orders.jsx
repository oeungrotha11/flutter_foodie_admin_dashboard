import { useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import api, { data, paged } from '../lib/api.js';
import { Badge, Button, Card, ConfirmDialog, Empty, ErrorBox, Modal, PageHeader, Pagination, Spinner, Td, Th, fmtDate, money, useFetch, useToast, cx } from '../components/ui.jsx';

const STATUSES = ['processing', 'purchased', 'cancelled'];
const SIZE = 10;

export default function Orders() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState('DESC');
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const { data: res, loading, error, reload, setData } = useFetch(
    () => api.get('/orders', { params: { page, size: SIZE, direction } }).then(paged), [page, direction]);

  const patch = (order) => setData((r) => ({ ...r, payload: r.payload.map((o) => (o.id === order.id ? order : o)) }));

  const setStatus = async (order, status) => {
    try {
      const updated = data(await api.put(`/admin/orders/${order.id}/status`, { status }));
      patch(updated);
      setView((v) => (v && v.id === updated.id ? updated : v));
      toast.success(`Order #${order.id} marked ${status}`);
    } catch (e) { toast.error(e.message); }
  };

  const remove = async () => {
    try {
      await api.delete(`/orders/${del.id}`);
      toast.success(`Order #${del.id} deleted`);
      reload();
    } catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Change an order's status from the list. Only processing orders can be deleted."
        action={<select aria-label="Sort" value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="DESC">Newest first</option><option value="ASC">Oldest first</option></select>} />
      <Card className="overflow-hidden">
        {loading && !res ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : res.payload.length === 0 ? <Empty title="No orders yet" hint="Orders placed from the app will show up here." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-paper/60"><tr><Th>Order</Th><Th>Placed</Th><Th>Type</Th><Th>Payment</Th><Th>Items</Th><Th>Total</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody className={cx('divide-y divide-line', loading && 'opacity-60')}>
                  {res.payload.map((o) => (
                    <tr key={o.id}>
                      <Td className="font-medium">#{o.id}</Td>
                      <Td className="whitespace-nowrap text-muted">{fmtDate(o.createdAt)}</Td>
                      <Td>{o.orderType}</Td>
                      <Td>{o.paymentMethod}</Td>
                      <Td>{o.itemCount}</Td>
                      <Td className="font-medium">{money(o.total)}</Td>
                      <Td>
                        <select aria-label={`Status of order ${o.id}`} value={o.status} onChange={(e) => setStatus(o, e.target.value)}
                          className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm capitalize">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" aria-label="View order" onClick={() => setView(o)}><Eye className="size-4" /></Button>
                        <Button variant="ghost" size="sm" aria-label="Delete order" disabled={o.status !== 'processing'} onClick={() => setDel(o)}><Trash2 className="size-4" /></Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={res.page} totalPages={res.totalPages} totalElements={res.totalElements} size={SIZE} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Order #${view.id}` : ''} wide>
        {view && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Badge kind={view.status} />
              <span className="text-muted">{fmtDate(view.createdAt)}</span>
              <span>{view.orderType} · {view.paymentMethod}</span>
              <span className="text-muted">Customer #{view.customerId}</span>
            </div>
            {view.address && <p><span className="text-muted">Deliver to: </span>{view.address}</p>}
            <table className="w-full">
              <thead className="border-b border-line"><tr><Th className="px-0">Item</Th><Th>Qty</Th><Th>Unit</Th><Th className="text-right">Subtotal</Th></tr></thead>
              <tbody className="divide-y divide-line">
                {view.items.map((it) => (
                  <tr key={it.id}>
                    <Td className="px-0"><p className="font-medium">{it.name}</p>{(it.size || it.addOns.length > 0) && <p className="text-xs text-muted">{[it.size, ...it.addOns].filter(Boolean).join(', ')}</p>}</Td>
                    <Td>{it.quantity}</Td><Td>{money(it.unitPrice)}</Td><Td className="text-right">{money(it.subtotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="ml-auto w-56 space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{money(view.deliveryFee)}</dd></div>
              {view.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{money(view.discount)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1.5 text-base font-bold"><dt>Total</dt><dd>{money(view.total)}</dd></div>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete order?" message={del && `Order #${del.id} will be permanently removed.`} onConfirm={remove} />
    </>
  );
}
