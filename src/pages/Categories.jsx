import { useMemo, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import api, { data, imgUrl } from '../lib/api.js';
import { Button, Card, ConfirmDialog, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, inputCls, useFetch, useToast } from '../components/ui.jsx';

export default function Categories() {
  const toast = useToast();
  const { data: list, loading, error, reload } = useFetch(() => api.get('/categories').then(data), []);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);

  const remove = async () => {
    try { await api.delete(`/categories/${del.categoryId}`); toast.success(`"${del.categoryName}" deleted`); reload(); }
    catch (e) { toast.error(e.message); throw e; }
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="A category can only be deleted once it has no products."
        action={<Button onClick={() => setEditing('new')}><Plus className="size-4" />Add category</Button>} />
      {loading && !list ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : list.length === 0 ? (
        <Card><Empty title="No categories yet" hint="Create categories first, then assign products to them." action={<Button onClick={() => setEditing('new')}>Add category</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Card key={c.categoryId} className="flex gap-4 p-4">
              <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-paper">{c.imageUrl && <img src={imgUrl(c.imageUrl)} alt="" className="size-full object-cover" />}</div>
              <div className="flex min-w-0 flex-1 flex-col">
                <h3 className="truncate text-lg font-bold">{c.categoryName}</h3>
                <p className="line-clamp-2 text-sm text-muted">{c.description || 'No description'}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-sm font-medium">{c.productCount} {c.productCount === 1 ? 'product' : 'products'}</span>
                  <div>
                    <Button variant="ghost" size="sm" aria-label="Edit" onClick={() => setEditing(c)}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label="Delete" onClick={() => setDel(c)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete category?" message={del && `"${del.categoryName}" will be removed.`} onConfirm={remove} />
    </>
  );
}

function CategoryForm({ category, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ categoryName: category?.categoryName || '', description: category?.description || '', image: null });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (f.image ? URL.createObjectURL(f.image) : imgUrl(category?.imageUrl)), [f.image, category]);

  const submit = async () => {
    const fd = new FormData();
    fd.append('categoryName', f.categoryName);
    fd.append('description', f.description);
    if (f.image) fd.append('image', f.image);
    setBusy(true); setErrors({});
    try {
      category ? await api.put(`/categories/${category.categoryId}`, fd) : await api.post('/categories', fd);
      toast.success(category ? 'Category updated' : 'Category created');
      onSaved();
    } catch (e) { setErrors(e.details || {}); toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={category ? 'Edit category' : 'Add category'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={submit}>{category ? 'Save changes' : 'Create category'}</Button></>}>
      <div className="space-y-4">
        <Field label="Name" error={errors.categoryName}><input className={inputCls} value={f.categoryName} onChange={(e) => setF({ ...f, categoryName: e.target.value })} /></Field>
        <Field label="Description" error={errors.description}><textarea rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Image" hint={category ? 'Leave empty to keep the current image.' : 'Optional. JPEG, PNG, WEBP or GIF.'}>
          <div className="flex items-center gap-3">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-paper text-muted">{preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6" />}</div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" onChange={(e) => setF({ ...f, image: e.target.files?.[0] || null })} />
          </div>
        </Field>
      </div>
    </Modal>
  );
}
