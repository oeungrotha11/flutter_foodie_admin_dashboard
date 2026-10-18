import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { data, paged } from '../lib/api.js';
import { Badge, Card, ErrorBox, PageHeader, Spinner, fmtDate, money, useFetch } from '../components/ui.jsx';

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

export default function Dashboard() {
  const { data: d, loading, error, reload } = useFetch(async () => {
    const [orders, products, customers, categories, promos] = await Promise.all([
      api.get('/orders', { params: { page: 1, size: 100, direction: 'DESC' } }),
      api.get('/products', { params: { page: 1, size: 1 } }),
      api.get('/customers', { params: { page: 1, size: 1 } }),
      api.get('/categories'),
      api.get('/promos'),
    ]);
    return {
      orders: paged(orders),
      products: paged(products).totalElements,
      customers: paged(customers).totalElements,
      categories: data(categories).length,
      activePromos: data(promos).filter((p) => p.active).length,
    };
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const list = d.orders.payload;
  const sampled = d.orders.totalElements > list.length;
  const by = (s) => list.filter((o) => o.status === s);
  const revenue = by('purchased').reduce((s, o) => s + o.total, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
    return { key: dayKey(dt), label: dt.toLocaleDateString([], { weekday: 'short' }), revenue: 0 };
  });
  list.filter((o) => o.status !== 'cancelled').forEach((o) => {
    const slot = days.find((x) => x.key === dayKey(o.createdAt));
    if (slot) slot.revenue += o.total;
  });

  const statuses = ['processing', 'purchased', 'cancelled'];
  const max = Math.max(1, ...statuses.map((s) => by(s).length));

  return (
    <>
      <PageHeader title="Dashboard" subtitle={sampled ? `Revenue and status figures cover your latest ${list.length} orders.` : 'Overview of your restaurant.'} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/orders" className="rounded-2xl bg-saffron p-5 transition hover:brightness-95">
          <p className="text-sm font-medium">Waiting to be processed</p>
          <p className="mt-2 font-display text-4xl font-bold">{by('processing').length}</p>
        </Link>
        <Card className="p-5"><p className="text-sm text-muted">Revenue (purchased)</p><p className="mt-2 font-display text-4xl font-bold">{money(revenue)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Total orders</p><p className="mt-2 font-display text-4xl font-bold">{d.orders.totalElements}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Customers</p><p className="mt-2 font-display text-4xl font-bold">{d.customers}</p></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Revenue, last 7 days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid vertical={false} stroke="#e2e6e1" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={44} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => money(v)} cursor={{ fill: '#f5f6f3' }} />
                <Bar dataKey="revenue" fill="#1b4f44" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold">Orders by status</h2>
          <div className="space-y-4">
            {statuses.map((s) => (
              <div key={s}>
                <div className="mb-1.5 flex justify-between text-sm"><span className="capitalize">{s}</span><span className="font-medium">{by(s).length}</span></div>
                <div className="h-2 rounded-full bg-paper">
                  <div className={`h-2 rounded-full ${s === 'processing' ? 'bg-saffron' : s === 'purchased' ? 'bg-pine-3' : 'bg-chili'}`} style={{ width: `${(by(s).length / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-sm">
            <div><dt className="text-muted">Products</dt><dd className="font-bold">{d.products}</dd></div>
            <div><dt className="text-muted">Categories</dt><dd className="font-bold">{d.categories}</dd></div>
            <div><dt className="text-muted">Live promos</dt><dd className="font-bold">{d.activePromos}</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold">Latest orders</h2>
          <Link to="/orders" className="text-sm font-medium text-pine-3 hover:underline">View all</Link>
        </div>
        {list.length === 0 ? <p className="px-5 pb-6 text-sm text-muted">No orders yet.</p> : (
          <ul className="divide-y divide-line border-t border-line">
            {list.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="font-medium">#{o.id}</span>
                <span className="hidden text-muted sm:block">{fmtDate(o.createdAt)}</span>
                <span className="text-muted">{o.itemCount} items</span>
                <span className="font-medium">{money(o.total)}</span>
                <Badge kind={o.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
