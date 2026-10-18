import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, ListPlus, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import api, { data, imgUrl, paged } from '../lib/api.js';
import { Badge, Button, Card, ConfirmDialog, Empty, ErrorBox, Field, Modal, PageHeader, Pagination, Spinner, Td, Th, cx, inputCls, money, useDebounced, useFetch, useToast } from '../components/ui.jsx';

const SIZE = 10;
const blank = { productName: '', description: '', unitPrice: '', rating: '', categoryId: '', image: null };

export default function Products() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const q = useDebounced(search);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [del, setDel] = useState(null);
  const [optionsFor, setOptionsFor] = useState(null);

  useEffect(() => setPage(1), [q, category]);

  const cats = useFetch(() => api.get('/categories').then(data), []);
  const { data: res, loading, error, reload } = useFetch(
    () => api.get('/products', { params: { page, size: SIZE, direction: 'DESC', search: q || undefined, category: category || undefined } }).then(paged),
    [page, q, category]);

  const remove = async () => {
    try { await api.delete(`/products/${del.productId}`); toast.success(`"${del.productName}" deleted`); reload(); }
    catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <>
      <PageHeader title="Products" subtitle="Your menu. Open a product's options to manage sizes and add-ons."
        action={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Add product</Button>} />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className={cx(inputCls, 'pl-9')} placeholder="Search by product or category" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          <option value="">All categories</option>
          {(cats.data || []).map((c) => <option key={c.categoryId} value={c.categoryName}>{c.categoryName}</option>)}
        </select>
      </div>

      <Card className="overflow-hidden">
        {loading && !res ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : res.payload.length === 0 ? (
          <Empty title="No products found" hint={q || category ? 'Try a different search or category.' : 'Add your first menu item.'} action={!q && !category && <Button onClick={() => setEditing('new')}>Add product</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-paper/60"><tr><Th>Product</Th><Th>Category</Th><Th>Price</Th><Th>Rating</Th><Th className="text-right">Actions</Th></tr></thead>
                <tbody className={cx('divide-y divide-line', loading && 'opacity-60')}>
                  {res.payload.map((p) => (
                    <tr key={p.productId}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <img src={imgUrl(p.imageUrl)} alt="" className="size-12 rounded-lg bg-paper object-cover" />
                          <div className="min-w-0"><p className="font-medium">{p.productName}</p><p className="max-w-xs truncate text-xs text-muted">{p.description}</p></div>
                        </div>
                      </Td>
                      <Td>{p.categoryName || '—'}</Td>
                      <Td className="font-medium">{money(p.unitPrice)}</Td>
                      <Td><span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-saffron text-saffron" />{p.rating}</span></Td>
                      <Td className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" aria-label="Options" title="Sizes & add-ons" onClick={() => setOptionsFor(p)}><ListPlus className="size-4" /></Button>
                        <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDel(p)}><Trash2 className="size-4" /></Button>
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

      {editing && <ProductForm product={editing === 'new' ? null : editing} categories={cats.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {optionsFor && <OptionsModal product={optionsFor} onClose={() => setOptionsFor(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete product?" message={del && `"${del.productName}" and its image will be permanently removed.`} onConfirm={remove} />
    </>
  );
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(product ? { productName: product.productName, description: product.description, unitPrice: product.unitPrice, rating: product.rating, categoryId: product.categoryId ?? '', image: null } : blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (f.image ? URL.createObjectURL(f.image) : imgUrl(product?.imageUrl)), [f.image, product]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const errs = {};
    if (!product && !f.image) errs.image = 'Image is required';
    if (Object.keys(errs).length) return setErrors(errs);
    const fd = new FormData();
    ['productName', 'description', 'unitPrice', 'rating', 'categoryId'].forEach((k) => fd.append(k, f[k]));
    if (f.image) fd.append('image', f.image);
    setBusy(true); setErrors({});
    try {
      product ? await api.put(`/products/${product.productId}`, fd) : await api.post('/products', fd);
      toast.success(product ? 'Product updated' : 'Product created');
      onSaved();
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={product ? 'Edit product' : 'Add product'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>{product ? 'Save changes' : 'Create product'}</Button></>}>
      <div className="space-y-4">
        <Field label="Name" error={errors.productName}><input className={inputCls} value={f.productName} onChange={set('productName')} /></Field>
        <Field label="Description" error={errors.description}><textarea rows={3} className={inputCls} value={f.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD)" error={errors.unitPrice}><input type="number" min="0" step="0.01" className={inputCls} value={f.unitPrice} onChange={set('unitPrice')} /></Field>
          <Field label="Rating (0–5)" error={errors.rating}><input type="number" min="0" max="5" step="0.1" className={inputCls} value={f.rating} onChange={set('rating')} /></Field>
        </div>
        <Field label="Category" error={errors.categoryId}>
          <select className={inputCls} value={f.categoryId} onChange={set('categoryId')}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}
          </select>
        </Field>
        <Field label="Image" error={errors.image} hint={product ? 'Leave empty to keep the current image.' : 'JPEG, PNG, WEBP or GIF, up to 5 MB.'}>
          <div className="flex items-center gap-3">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper text-muted">{preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6" />}</div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" onChange={(e) => setF({ ...f, image: e.target.files?.[0] || null })} />
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function OptionsModal({ product, onClose }) {
  const toast = useToast();
  const { data: all, loading, error, reload } = useFetch(() => api.get('/product-options').then(data), []);
  const options = (all || []).filter((o) => o.productId === product.productId);
  const [form, setForm] = useState(null); // null | {optionId?, optionName, optionType, extraPrice}
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const body = { optionName: form.optionName, optionType: form.optionType, extraPrice: Number(form.extraPrice) };
    try {
      form.optionId ? await api.put(`/product-options/${form.optionId}`, body) : await api.post(`/products/${product.productId}/options`, body);
      toast.success('Option saved'); setForm(null); reload();
    } catch (e) { toast.error(e.details ? Object.values(e.details).join(' ') : e.message); }
    finally { setBusy(false); }
  };

  const toggle = async (o) => {
    try { await api.patch(`/product-options/${o.optionId}/${o.active ? 'deactivate' : 'activate'}`); reload(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <Modal open onClose={onClose} title={`Options · ${product.productName}`} wide>
      {loading && !all ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <div className="space-y-4">
          {options.length === 0 ? <p className="text-sm text-muted">No sizes or add-ons yet.</p> : (
            <table className="w-full text-sm">
              <thead className="border-b border-line"><tr><Th className="px-0">Name</Th><Th>Type</Th><Th>Extra</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
              <tbody className="divide-y divide-line">
                {options.map((o) => (
                  <tr key={o.optionId}>
                    <Td className="px-0 font-medium">{o.optionName}</Td>
                    <Td>{o.optionType === 'SIZE' ? 'Size' : 'Add-on'}</Td>
                    <Td>{money(o.extraPrice)}</Td>
                    <Td><Badge kind={o.active ? 'active' : 'inactive'}>{o.active ? 'Active' : 'Hidden'}</Badge></Td>
                    <Td className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setForm({ ...o })}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle(o)}>{o.active ? 'Hide' : 'Show'}</Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {form ? (
            <div className="grid items-end gap-3 rounded-xl bg-paper p-4 sm:grid-cols-[1fr_auto_auto_auto]">
              <Field label="Name"><input className={inputCls} value={form.optionName} onChange={(e) => setForm({ ...form, optionName: e.target.value })} /></Field>
              <Field label="Type"><select className={inputCls} value={form.optionType} onChange={(e) => setForm({ ...form, optionType: e.target.value })}><option value="SIZE">Size</option><option value="ADD_ON">Add-on</option></select></Field>
              <Field label="Extra price"><input type="number" min="0" step="0.01" className={cx(inputCls, 'w-28')} value={form.extraPrice} onChange={(e) => setForm({ ...form, extraPrice: e.target.value })} /></Field>
              <div className="flex gap-2"><Button loading={busy} onClick={save}>Save</Button><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button></div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setForm({ optionName: '', optionType: 'SIZE', extraPrice: 0 })}><Plus className="size-4" />Add option</Button>
          )}
        </div>
      )}
    </Modal>
  );
}
