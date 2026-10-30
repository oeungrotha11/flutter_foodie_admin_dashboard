import { useState } from 'react';
import { Eye, Trash2, LockKeyhole, Save } from 'lucide-react';
import api, { paged } from '../lib/api.js';
import { Badge, Button, Card, ConfirmDialog, Empty, ErrorBox, Modal, PageHeader, Pagination, Spinner, Td, Th, fmtDate, money, useFetch, useToast, cx } from '../components/ui.jsx';

const SIZE = 10;

export default function Orders() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState('DESC');
  const [view, setView] = useState(null);
  const [statusDraft, setStatusDraft] = useState('processing');
  const [savingStatus, setSavingStatus] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [del, setDel] = useState(null);
  const { data: res, loading, error, reload } = useFetch(
    () => api.get('/orders', { params: { page, size: SIZE, direction } }).then(paged), [page, direction]);



  const openOrder = async (order) => {
    setView(order);
    setStatusDraft(order.status);
    setSelectedDriver('');
    if (order.address && order.deliveryLatitude != null && order.deliveryLongitude != null) {
      try {
        const list = (await api.get('/admin/deliveries/drivers')).data?.payload || [];
        setDrivers(list.filter((d) => d.approved && d.available));
      } catch (e) { toast.error(e.message || 'Could not load available drivers'); }
    }
  };

  const assignDriver = async () => {
    if (!view || !selectedDriver) return;
    setAssigning(true);
    try {
      await api.post('/admin/deliveries/assign', { orderId: view.id, driverUserId: Number(selectedDriver) });
      toast.success('Driver assigned to this delivery');
      setSelectedDriver('');
      setDrivers((items) => items.filter((d) => String(d.userId) !== selectedDriver));
    } catch (e) { toast.error(e.message || 'Could not assign driver'); }
    finally { setAssigning(false); }
  };

  const updateStatus = async () => {
    if (!view || view.status !== 'processing' || statusDraft === view.status) return;
    setSavingStatus(true);
    try {
      // Admin status endpoint: PUT /api/v1/admin/orders/{id}/status
      await api.put(`/admin/orders/${view.id}/status`, { status: statusDraft });
      setView((current) => current ? { ...current, status: statusDraft } : current);
      toast.success(`Order #${view.id} status updated to ${statusDraft}`);
      reload();
    } catch (e) {
      toast.error(e.message || 'Could not update order status');
    } finally {
      setSavingStatus(false);
    }
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
      <PageHeader title="Orders" subtitle="Review order details. Only processing orders can be deleted."
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
                      <Td><Badge kind={o.status}>{o.status}</Badge></Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" aria-label="View order" onClick={() => openOrder(o)}><Eye className="size-4" /></Button>
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
            <section className="rounded-xl border border-line bg-paper/50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <LockKeyhole className="size-4 text-muted" />
                Order status
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge kind={view.status}>{view.status}</Badge>
                <select
                  aria-label="Order status"
                  value={statusDraft}
                  disabled={savingStatus || view.status !== 'processing'}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-muted"
                >
                  <option value="processing">Processing</option>
                  <option value="purchased">Purchased</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {view.status === 'processing' && (
                  <Button
                    size="sm"
                    disabled={savingStatus || statusDraft === view.status}
                    onClick={updateStatus}
                  >
                    <Save className="mr-1.5 size-4" />
                    {savingStatus ? 'Saving…' : 'Save status'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted">
                You can move a processing order to purchased or cancelled. Once changed, its status cannot be changed again.
              </p>
            </section>
            {view.address && <p><span className="text-muted">Deliver to: </span>{view.address}</p>}
            {view.address && view.deliveryLatitude != null && view.deliveryLongitude != null && (
              <section className="rounded-xl border border-line p-4 space-y-3">
                <div className="font-semibold">Delivery assignment</div>
                <p className="text-xs text-muted">Destination coordinates: {view.deliveryLatitude}, {view.deliveryLongitude}</p>
                <div className="flex flex-wrap gap-2">
                  <select aria-label="Available driver" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}
                    className="min-w-56 rounded-lg border border-line bg-white px-3 py-2">
                    <option value="">Choose an approved, available driver</option>
                    {drivers.map((d) => <option key={d.userId} value={d.userId}>{d.fullName || d.email} · {d.vehiclePlate || 'No plate'}</option>)}
                  </select>
                  <Button size="sm" disabled={!selectedDriver || assigning} onClick={assignDriver}>{assigning ? 'Assigning…' : 'Assign driver'}</Button>
                </div>
                {!drivers.length && <p className="text-xs text-muted">No approved and available drivers were found. Create and approve a driver first.</p>}
              </section>
            )}

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
