import React, { useEffect, useMemo, useState } from 'react';
import {
  getProducts, createProduct, updateProduct, deleteProduct, downloadCSV,
} from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';

const EMPTY = { name: '', sku: '', price: '', quantity: '' };

function validate(form) {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = 'Name is required';
  if (!form.sku || !form.sku.trim()) errors.sku = 'SKU is required';
  const price = parseFloat(form.price);
  if (form.price === '' || Number.isNaN(price)) errors.price = 'Price is required';
  else if (price <= 0) errors.price = 'Price must be greater than 0';
  const qty = parseInt(form.quantity, 10);
  if (form.quantity === '' || Number.isNaN(qty)) errors.quantity = 'Quantity is required';
  else if (qty < 0) errors.quantity = 'Quantity cannot be negative';
  return errors;
}

function ProductForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});

  const update = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity, 10),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group">
        <label className="form-group__label" htmlFor="p-name">Product name</label>
        <input id="p-name" className={`input ${errors.name ? 'input--error' : ''}`} value={form.name} onChange={update('name')} placeholder="e.g. Linen Apron" autoFocus />
        {errors.name && <div className="form-group__error">{errors.name}</div>}
      </div>
      <div className="form-group">
        <label className="form-group__label" htmlFor="p-sku">SKU</label>
        <input id="p-sku" className={`input ${errors.sku ? 'input--error' : ''}`} value={form.sku} onChange={update('sku')} placeholder="e.g. LIN-APR-001" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }} />
        {errors.sku && <div className="form-group__error">{errors.sku}</div>}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-group__label" htmlFor="p-price">Price</label>
          <input id="p-price" type="number" step="0.01" min="0" className={`input ${errors.price ? 'input--error' : ''}`} value={form.price} onChange={update('price')} placeholder="0.00" />
          {errors.price && <div className="form-group__error">{errors.price}</div>}
        </div>
        <div className="form-group">
          <label className="form-group__label" htmlFor="p-qty">Quantity in stock</label>
          <input id="p-qty" type="number" min="0" step="1" className={`input ${errors.quantity ? 'input--error' : ''}`} value={form.quantity} onChange={update('quantity')} placeholder="0" />
          {errors.quantity && <div className="form-group__error">{errors.quantity}</div>}
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial?.id ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  );
}

function Products() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    return getProducts()
      .then((data) => {
        setItems(data);
        setSelected(new Set());
      })
      .catch((e) => toast.error(`Could not load products: ${e.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Listen for keyboard shortcut 'N' to open create modal
  useEffect(() => {
    const handler = () => { setEditing(null); setModalOpen(true); };
    window.addEventListener('shortcut:new-product', handler);
    return () => window.removeEventListener('shortcut:new-product', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    );
  }, [items, search]);

  const visibleIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p) => {
    setEditing({ id: p.id, name: p.name ?? '', sku: p.sku ?? '', price: p.price ?? '', quantity: p.quantity ?? '' });
    setModalOpen(true);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editing?.id) { await updateProduct(editing.id, data); toast.success(`Updated "${data.name}"`); }
      else { await createProduct(data); toast.success(`Created "${data.name}"`); }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e) { toast.error(e.message || 'Save failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteProduct(confirmDel.id);
      toast.success(`Deleted "${confirmDel.name}"`);
      setConfirmDel(null);
      await load();
    } catch (e) { toast.error(e.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteProduct(id)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      const ok = results.length - failed;
      if (ok) toast.success(`Deleted ${ok} product${ok === 1 ? '' : 's'}`);
      if (failed) toast.error(`${failed} item${failed === 1 ? '' : 's'} could not be deleted`);
      setConfirmBulk(false);
      await load();
    } catch (e) { toast.error(e.message || 'Bulk delete failed'); }
    finally { setBulkBusy(false); }
  };

  const handleExport = () => {
    downloadCSV(items, 'products-export', [
      { label: 'Name', accessor: (r) => r.name },
      { label: 'SKU', accessor: (r) => r.sku },
      { label: 'Price', accessor: (r) => r.price },
      { label: 'Quantity', accessor: (r) => r.quantity },
      { label: 'Status', accessor: (r) => (r.quantity === 0 ? 'Out of stock' : r.quantity <= 5 ? 'Low' : 'In stock') },
    ]);
    toast.success('Products exported to CSV');
  };

  const fmt = (n) => n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(Number(n));

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="page-header__meta">Catalog · 02</div>
          <h1 className="page-header__title">Products <em>&amp; inventory</em></h1>
          <p className="page-header__sub">Add, edit, and manage every SKU flowing through the warehouse.</p>
        </div>
        <button className="btn btn--accent" onClick={openCreate}><span className="btn__plus">+</span> Add product</button>
      </header>

      <section className="card card--flush">
        <div className="card-toolbar">
          <div className="card-toolbar__left">
            <div>
              <div className="card__eyebrow">All products</div>
              <h2 className="card__title" style={{ fontSize: '1rem' }}>{loading ? '…' : `${filtered.length} of ${items.length} item${items.length === 1 ? '' : 's'}`}</h2>
            </div>
          </div>
          <div className="card-toolbar__right">
            <div className="search-bar">
              <span className="search-bar__icon">⌕</span>
              <input
                className="search-bar__input"
                placeholder="Search name or SKU…  (⌘K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-shortcut="search"
              />
              {search && <button className="search-bar__clear" onClick={() => setSearch('')}>×</button>}
            </div>
            {items.length > 0 && <button className="export-btn" onClick={handleExport}>↓ CSV</button>}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar" role="region" aria-label="Bulk actions">
            <div className="bulk-bar__count">
              <span className="bulk-bar__badge">{selected.size}</span>
              <span>selected</span>
            </div>
            <div className="bulk-bar__actions">
              <button className="btn btn--ghost btn--sm" onClick={clearSelection}>Clear</button>
              <button className="btn btn--danger btn--sm" onClick={() => setConfirmBulk(true)}>
                Delete selected
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : items.length === 0 ? (
          <div className="state">
            <div className="state__icon">▢</div>
            <div className="state__title">No products yet</div>
            <p>Create your first product to start tracking inventory.</p>
            <div className="mt-4"><button className="btn btn--primary" onClick={openCreate}>Add product</button></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="state">
            <div className="state__title">No matches for "{search}"</div>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="table__check">
                    <input
                      type="checkbox"
                      aria-label="Select all visible rows"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                      onChange={toggleAllVisible}
                    />
                  </th>
                  <th>Name</th>
                  <th>SKU</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Quantity</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <tr key={p.id} className={isSel ? 'row-selected' : ''}>
                      <td className="table__check">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.name}`}
                          checked={isSel}
                          onChange={() => toggleOne(p.id)}
                        />
                      </td>
                      <td className="product-name">{p.name}</td>
                      <td className="product-sku">{p.sku}</td>
                      <td className="num text-right">{fmt(p.price)}</td>
                      <td className="num text-right">{p.quantity}</td>
                      <td>{p.quantity === 0 ? <span className="badge badge--danger">Out</span> : p.quantity <= 5 ? <span className="badge badge--warning">Low</span> : <span className="badge badge--success">In stock</span>}</td>
                      <td className="actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDel(p)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={modalOpen} onClose={() => { if (!submitting) { setModalOpen(false); setEditing(null); } }} title={editing?.id ? 'Edit product' : 'New product'}>
        <ProductForm initial={editing || EMPTY} submitting={submitting} onSubmit={handleSubmit} onCancel={() => { setModalOpen(false); setEditing(null); }} />
      </Modal>

      <ConfirmDialog isOpen={!!confirmDel} title="Delete product" message={confirmDel ? `"${confirmDel.name}" will be permanently removed. This cannot be undone.` : ''} onConfirm={handleDelete} onCancel={() => !deleting && setConfirmDel(null)} busy={deleting} />

      <ConfirmDialog
        isOpen={confirmBulk}
        title="Delete selected products"
        message={`${selected.size} product${selected.size === 1 ? '' : 's'} will be permanently removed. This cannot be undone.`}
        confirmLabel={`Delete ${selected.size}`}
        onConfirm={handleBulkDelete}
        onCancel={() => !bulkBusy && setConfirmBulk(false)}
        busy={bulkBusy}
      />
    </div>
  );
}

export default Products;
