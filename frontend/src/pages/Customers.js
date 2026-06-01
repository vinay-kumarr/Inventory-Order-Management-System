import React, { useEffect, useMemo, useState } from 'react';
import {
  getCustomers, createCustomer, deleteCustomer, downloadCSV,
} from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';

const EMPTY = { full_name: '', email: '', phone: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.full_name || !form.full_name.trim()) errors.full_name = 'Full name is required';
  if (!form.email || !form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address';
  if (!form.phone || !form.phone.trim()) errors.phone = 'Phone is required';
  return errors;
}

function CustomerForm({ onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const update = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group">
        <label className="form-group__label" htmlFor="c-name">Full name</label>
        <input id="c-name" className={`input ${errors.full_name ? 'input--error' : ''}`} value={form.full_name} onChange={update('full_name')} placeholder="e.g. Amelia Hart" autoFocus />
        {errors.full_name && <div className="form-group__error">{errors.full_name}</div>}
      </div>
      <div className="form-group">
        <label className="form-group__label" htmlFor="c-email">Email</label>
        <input id="c-email" type="email" className={`input ${errors.email ? 'input--error' : ''}`} value={form.email} onChange={update('email')} placeholder="amelia@example.com" />
        {errors.email && <div className="form-group__error">{errors.email}</div>}
      </div>
      <div className="form-group">
        <label className="form-group__label" htmlFor="c-phone">Phone</label>
        <input id="c-phone" type="tel" className={`input ${errors.phone ? 'input--error' : ''}`} value={form.phone} onChange={update('phone')} placeholder="+1 555 123 4567" />
        {errors.phone && <div className="form-group__error">{errors.phone}</div>}
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Create customer'}
        </button>
      </div>
    </form>
  );
}

function Customers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = () => {
    setLoading(true);
    return getCustomers()
      .then(setItems)
      .catch((e) => toast.error(`Could not load customers: ${e.message}`))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((c) =>
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      await createCustomer(data);
      toast.success(`Added "${data.full_name}"`);
      setModalOpen(false);
      await load();
    } catch (e) { toast.error(e.message || 'Save failed'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteCustomer(confirmDel.id);
      toast.success(`Deleted "${confirmDel.full_name}"`);
      setConfirmDel(null);
      await load();
    } catch (e) { toast.error(e.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

  const handleExport = () => {
    downloadCSV(items, 'customers-export', [
      { label: 'Name', accessor: (r) => r.full_name },
      { label: 'Email', accessor: (r) => r.email },
      { label: 'Phone', accessor: (r) => r.phone },
    ]);
    toast.success('Customers exported to CSV');
  };

  const initials = (name) =>
    (name || '?').split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="page-header__meta">Relationships · 03</div>
          <h1 className="page-header__title">Customers <em>&amp; contacts</em></h1>
          <p className="page-header__sub">The people who keep the warehouse moving. Add them here to assign orders.</p>
        </div>
        <button className="btn btn--accent" onClick={() => setModalOpen(true)}><span className="btn__plus">+</span> Add customer</button>
      </header>

      <section className="card card--flush">
        <div className="card-toolbar">
          <div className="card-toolbar__left">
            <div>
              <div className="card__eyebrow">Directory</div>
              <h2 className="card__title" style={{ fontSize: '1rem' }}>{loading ? '…' : `${filtered.length} of ${items.length} customer${items.length === 1 ? '' : 's'}`}</h2>
            </div>
          </div>
          <div className="card-toolbar__right">
            <div className="search-bar">
              <span className="search-bar__icon">⌕</span>
              <input className="search-bar__input" placeholder="Search name, email…  (⌘K)" value={search} onChange={(e) => setSearch(e.target.value)} data-shortcut="search" />
              {search && <button className="search-bar__clear" onClick={() => setSearch('')}>×</button>}
            </div>
            {items.length > 0 && <button className="export-btn" onClick={handleExport}>↓ CSV</button>}
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={4} />
        ) : items.length === 0 ? (
          <div className="state">
            <div className="state__icon">◯</div>
            <div className="state__title">No customers yet</div>
            <p>Add your first contact to start creating orders.</p>
            <div className="mt-4"><button className="btn btn--primary" onClick={() => setModalOpen(true)}>Add customer</button></div>
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div aria-hidden="true" style={{
                          width: 34, height: 34, borderRadius: 10,
                          background: 'var(--ink)', color: 'var(--accent)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 500,
                          letterSpacing: '0.02em',
                        }}>
                          {initials(c.full_name)}
                        </div>
                        <span className="product-name">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="muted">{c.email}</td>
                    <td className="text-mono" style={{ fontSize: 13 }}>{c.phone}</td>
                    <td className="actions">
                      <button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDel(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="New customer">
        <CustomerForm submitting={submitting} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog isOpen={!!confirmDel} title="Delete customer" message={confirmDel ? `"${confirmDel.full_name}" will be permanently removed. This cannot be undone.` : ''} onConfirm={handleDelete} onCancel={() => !deleting && setConfirmDel(null)} busy={deleting} />
    </div>
  );
}

export default Customers;
