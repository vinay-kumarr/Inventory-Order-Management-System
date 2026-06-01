import React, { useEffect, useMemo, useState } from 'react';
import {
  getOrders,
  getOrder,
  createOrder,
  deleteOrder,
  getCustomers,
  getProducts,
} from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function statusBadge(status) {
  const s = (status || '').toString().toLowerCase();
  if (['paid', 'completed', 'fulfilled', 'shipped'].includes(s)) return <span className="badge badge--success">{status}</span>;
  if (['pending', 'processing', 'open'].includes(s)) return <span className="badge badge--info">{status}</span>;
  if (['cancelled', 'canceled', 'failed', 'refunded'].includes(s)) return <span className="badge badge--danger">{status}</span>;
  if (['on hold', 'hold', 'low stock'].includes(s)) return <span className="badge badge--warning">{status}</span>;
  return <span className="badge badge--neutral">{status || '—'}</span>;
}

function OrderBuilder({ customers, products, onSubmit, onCancel, submitting }) {
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [errors, setErrors] = useState({});

  const total = useMemo(() => {
    return lines.reduce((sum, l) => {
      const prod = products.find((p) => String(p.id) === String(l.product_id));
      const qty = parseInt(l.quantity, 10) || 0;
      const price = prod ? Number(prod.price) : 0;
      return sum + price * qty;
    }, 0);
  }, [lines, products]);

  const updateLine = (idx, key, value) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
    if (errors[`line-${idx}`]) {
      setErrors((er) => ({ ...er, [`line-${idx}`]: undefined }));
    }
  };

  const addLine = () => setLines((ls) => [...ls, { product_id: '', quantity: 1 }]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!customerId) errs.customer = 'Choose a customer';
    if (lines.length === 0) errs.lines = 'Add at least one line item';
    lines.forEach((l, i) => {
      if (!l.product_id) errs[`line-${i}`] = 'Select a product';
      else if (!(parseInt(l.quantity, 10) >= 1)) errs[`line-${i}`] = 'Quantity must be ≥ 1';
    });

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    onSubmit({
      customer_id: parseInt(customerId, 10),
      items: lines.map((l) => ({
        product_id: parseInt(l.product_id, 10),
        quantity: parseInt(l.quantity, 10),
      })),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group">
        <label className="form-group__label" htmlFor="o-customer">Customer</label>
        <select
          id="o-customer"
          className={`select ${errors.customer ? 'input--error' : ''}`}
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value);
            if (errors.customer) setErrors((er) => ({ ...er, customer: undefined }));
          }}
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} — {c.email}
            </option>
          ))}
        </select>
        {errors.customer && <div className="form-group__error">{errors.customer}</div>}
      </div>

      <div className="form-group">
        <label className="form-group__label">Line items</label>
        <div className="line-items">
          {lines.map((line, idx) => {
            const prod = products.find((p) => String(p.id) === String(line.product_id));
            return (
              <div key={idx}>
                <div className="line-item">
                  <select
                    className={`select ${errors[`line-${idx}`] ? 'input--error' : ''}`}
                    value={line.product_id}
                    onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                  >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                        {p.name} · {fmtMoney(p.price)} · {p.quantity} in stock
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={`input ${errors[`line-${idx}`] ? 'input--error' : ''}`}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                  />
                  <button
                    type="button"
                    className="line-item__remove"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    aria-label="Remove line"
                    title="Remove line"
                  >
                    ×
                  </button>
                </div>
                {errors[`line-${idx}`] && (
                  <div className="form-group__error" style={{ marginTop: 4, marginLeft: 12 }}>
                    {errors[`line-${idx}`]}
                  </div>
                )}
                {prod && parseInt(line.quantity, 10) > prod.quantity && (
                  <div className="form-group__hint" style={{ marginTop: 4, marginLeft: 12, color: 'var(--warning)' }}>
                    Heads-up: requested quantity exceeds {prod.quantity} in stock.
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className="btn btn--secondary btn--sm line-add" onClick={addLine}>
          <span className="btn__plus">+</span> Add another item
        </button>
        {errors.lines && <div className="form-group__error">{errors.lines}</div>}
      </div>

      <div className="order-total">
        <span className="order-total__label">Total</span>
        <span className="order-total__value">
          <strong>{fmtMoney(total)}</strong>
        </span>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create order'}
        </button>
      </div>
    </form>
  );
}

function OrderDetails({ order }) {
  if (!order) return <div className="state"><div className="state__title">Loading…</div></div>;

  const items = order.items || order.order_items || [];

  return (
    <div>
      <div className="order-detail-meta">
        <div className="order-detail-meta__item">
          <dt>Order ID</dt>
          <dd className="text-mono">#{order.id}</dd>
        </div>
        <div className="order-detail-meta__item">
          <dt>Customer</dt>
          <dd>{order.customer_name || order.customer?.full_name || '—'}</dd>
        </div>
        <div className="order-detail-meta__item">
          <dt>Status</dt>
          <dd>{statusBadge(order.status)}</dd>
        </div>
        <div className="order-detail-meta__item">
          <dt>Created</dt>
          <dd>{fmtDate(order.created_at || order.date)}</dd>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Items</h3>
      {items.length === 0 ? (
        <div className="muted">No items recorded.</div>
      ) : (
        <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit price</th>
                <th className="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const unit = it.unit_price ?? it.price ?? 0;
                const qty = it.quantity ?? 0;
                return (
                  <tr key={it.id ?? i}>
                    <td className="product-name">{it.product_name || it.name || `Product #${it.product_id}`}</td>
                    <td className="num text-right">{qty}</td>
                    <td className="num text-right">{fmtMoney(unit)}</td>
                    <td className="num text-right">{fmtMoney(unit * qty)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="order-total">
        <span className="order-total__label">Order total</span>
        <span className="order-total__value">
          <strong>{fmtMoney(order.total_amount ?? order.total)}</strong>
        </span>
      </div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const loadOrders = () =>
    getOrders()
      .then(setOrders)
      .catch((e) => toast.error(`Could not load orders: ${e.message}`));

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOrders(),
        getCustomers().then(setCustomers).catch(() => {}),
        getProducts().then(setProducts).catch(() => {}),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const openCreate = async () => {
    // Refresh customers + products in case anything changed
    try {
      const [cs, ps] = await Promise.all([getCustomers(), getProducts()]);
      setCustomers(cs);
      setProducts(ps);
    } catch (e) {
      toast.error(`Could not prepare order form: ${e.message}`);
      return;
    }
    setCreateOpen(true);
  };

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      await createOrder(payload);
      toast.success('Order created');
      setCreateOpen(false);
      await loadOrders();
    } catch (e) {
      toast.error(e.message || 'Could not create order');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = async (order) => {
    setDetailOpen(true);
    setLoadingDetail(true);
    setDetail(order); // optimistic
    try {
      const full = await getOrder(order.id);
      setDetail(full);
    } catch (e) {
      toast.error(`Could not load order: ${e.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteOrder(confirmDel.id);
      toast.success(`Order #${confirmDel.id} cancelled`);
      setConfirmDel(null);
      setDetailOpen(false);
      await loadOrders();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="page-header__meta">Fulfillment · 04</div>
          <h1 className="page-header__title">
            Orders <em>in motion</em>
          </h1>
          <p className="page-header__sub">
            Compose new orders, inspect line items, and clear cancellations when needed.
          </p>
        </div>
        <button className="btn btn--accent" onClick={openCreate}>
          <span className="btn__plus">+</span> Create order
        </button>
      </header>

      <section className="card card--flush">
        <div className="card__header">
          <div>
            <div className="card__eyebrow">All orders</div>
            <h2 className="card__title">
              {loading ? 'Loading…' : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="state"><div className="state__title">Fetching orders…</div></div>
        ) : orders.length === 0 ? (
          <div className="state">
            <div className="state__icon">◇</div>
            <div className="state__title">No orders yet</div>
            <p>Create your first order to start tracking fulfilment.</p>
            <div className="mt-4">
              <button className="btn btn--primary" onClick={openCreate}>Create order</button>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="row-clickable" onClick={() => openDetails(o)}>
                    <td className="text-mono" style={{ fontWeight: 600 }}>#{o.id}</td>
                    <td className="product-name">{o.customer_name || o.customer?.full_name || `Customer #${o.customer_id}`}</td>
                    <td className="num text-right">{fmtMoney(o.total_amount ?? o.total)}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtDate(o.created_at || o.date)}</td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openDetails(o)}>View</button>
                      <button
                        className="btn btn--ghost btn--sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setConfirmDel(o)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        title="Create order"
        wide
      >
        <OrderBuilder
          customers={customers}
          products={products}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail ? `Order #${detail.id}` : 'Order details'}
        wide
      >
        {loadingDetail && !detail ? (
          <div className="state"><div className="state__title">Loading…</div></div>
        ) : (
          <>
            <OrderDetails order={detail} />
            <div className="form-actions">
              <button className="btn btn--secondary" onClick={() => setDetailOpen(false)}>
                Close
              </button>
              {detail && (
                <button className="btn btn--danger" onClick={() => setConfirmDel(detail)}>
                  Cancel order
                </button>
              )}
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDel}
        title="Cancel order"
        message={confirmDel ? `Order #${confirmDel.id} will be cancelled and removed. This cannot be undone.` : ''}
        confirmLabel="Cancel order"
        cancelLabel="Keep"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDel(null)}
        busy={deleting}
      />
    </div>
  );
}

export default Orders;
