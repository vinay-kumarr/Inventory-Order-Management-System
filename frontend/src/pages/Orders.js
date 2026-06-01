import React, { useEffect, useMemo, useState } from 'react';
import {
  getOrders, getOrder, createOrder, deleteOrder, updateOrderStatus,
  getCustomers, getProducts, downloadCSV,
} from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(Number(n));

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function statusBadge(status) {
  const s = (status || '').toString().toLowerCase();
  if (s === 'delivered') return <span className="badge badge--success">{status}</span>;
  if (s === 'shipped') return <span className="badge badge--info">{status}</span>;
  if (s === 'confirmed') return <span className="badge badge--accent">{status}</span>;
  if (['cancelled', 'canceled', 'failed', 'refunded'].includes(s)) return <span className="badge badge--danger">{status}</span>;
  return <span className="badge badge--neutral">{status || '—'}</span>;
}

function OrderBuilder({ customers, products, onSubmit, onCancel, submitting }) {
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ product_id: '', quantity: 1 }]);
  const [errors, setErrors] = useState({});

  const total = useMemo(() =>
    lines.reduce((sum, l) => {
      const prod = products.find((p) => String(p.id) === String(l.product_id));
      const qty = parseInt(l.quantity, 10) || 0;
      const price = prod ? Number(prod.price) : 0;
      return sum + price * qty;
    }, 0),
  [lines, products]);

  const updateLine = (idx, key, value) => {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
    if (errors[`line-${idx}`]) setErrors((er) => ({ ...er, [`line-${idx}`]: undefined }));
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
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ customer_id: parseInt(customerId, 10), items: lines.map((l) => ({ product_id: parseInt(l.product_id, 10), quantity: parseInt(l.quantity, 10) })) });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group">
        <label className="form-group__label" htmlFor="o-customer">Customer</label>
        <select id="o-customer" className={`select ${errors.customer ? 'input--error' : ''}`} value={customerId} onChange={(e) => { setCustomerId(e.target.value); if (errors.customer) setErrors((er) => ({ ...er, customer: undefined })); }}>
          <option value="">Select a customer…</option>
          {customers.map((c) => (<option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>))}
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
                  <select className={`select ${errors[`line-${idx}`] ? 'input--error' : ''}`} value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}>
                    <option value="">Select a product…</option>
                    {products.map((p) => (<option key={p.id} value={p.id} disabled={p.quantity === 0}>{p.name} · {fmtMoney(p.price)} · {p.quantity} in stock</option>))}
                  </select>
                  <input type="number" min="1" step="1" className={`input ${errors[`line-${idx}`] ? 'input--error' : ''}`} value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} placeholder="Qty" />
                  <button type="button" className="line-item__remove" onClick={() => removeLine(idx)} disabled={lines.length === 1} aria-label="Remove line">×</button>
                </div>
                {errors[`line-${idx}`] && <div className="form-group__error" style={{ marginTop: 4, marginLeft: 12 }}>{errors[`line-${idx}`]}</div>}
                {prod && parseInt(line.quantity, 10) > prod.quantity && (
                  <div className="form-group__hint" style={{ marginTop: 4, marginLeft: 12, color: 'var(--warning)' }}>Heads-up: requested quantity exceeds {prod.quantity} in stock.</div>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className="btn btn--secondary btn--sm line-add" onClick={addLine}><span className="btn__plus">+</span> Add another item</button>
        {errors.lines && <div className="form-group__error">{errors.lines}</div>}
      </div>
      <div className="order-total">
        <span className="order-total__label">Total</span>
        <span className="order-total__value"><strong>{fmtMoney(total)}</strong></span>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create order'}</button>
      </div>
    </form>
  );
}

function OrderStatusActions({ order, onStatusChange }) {
  const s = (order?.status || '').toLowerCase();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [confirmAction, setConfirmAction] = useState(null);

  const doStatus = async (newStatus) => {
    setBusy(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      toast.success(`Order #${order.id} marked as ${newStatus}`);
      setConfirmAction(null);
      onStatusChange();
    } catch (e) {
      toast.error(e.message || 'Status update failed');
    } finally {
      setBusy(false);
    }
  };

  const needsConfirm = (newStatus) => {
    const labels = { shipped: 'Ship', delivered: 'Deliver', cancelled: 'Cancel' };
    setConfirmAction({ label: labels[newStatus], action: () => doStatus(newStatus) });
  };

  return (
    <>
      <div className="status-actions">
        {s === 'confirmed' && <button className="status-btn status-btn--ship" onClick={() => needsConfirm('shipped')}>🚚 Mark shipped</button>}
        {s === 'shipped' && <button className="status-btn status-btn--deliver" onClick={() => needsConfirm('delivered')}>📦 Mark delivered</button>}
        {['confirmed', 'shipped'].includes(s) && <button className="status-btn status-btn--cancel" onClick={() => needsConfirm('cancelled')}>✕ Cancel order</button>}
      </div>
      <ConfirmDialog
        isOpen={!!confirmAction}
        title={confirmAction ? `${confirmAction.label} order` : ''}
        message={confirmAction && order ? `Order #${order.id} will be marked as ${confirmAction.label.toLowerCase()}.` : ''}
        confirmLabel={confirmAction?.label || 'Confirm'}
        cancelLabel="Back"
        onConfirm={confirmAction?.action || (() => {})}
        onCancel={() => !busy && setConfirmAction(null)}
        busy={busy}
      />
    </>
  );
}

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function printInvoice(order) {
  if (!order) return;
  const items = order.items || order.order_items || [];
  const customerName = order.customer_name || order.customer?.full_name || `Customer #${order.customer_id}`;
  const customerEmail = order.customer?.email || order.customer_email || '';
  const customerPhone = order.customer?.phone || order.customer_phone || '';
  const created = fmtDate(order.created_at || order.date);
  const total = Number(order.total_amount ?? order.total ?? 0);
  const subtotal = items.reduce((acc, it) => acc + Number(it.unit_price ?? it.price ?? 0) * Number(it.quantity ?? 0), 0);
  const tax = Math.max(0, total - subtotal);
  const status = order.status || '—';

  const rows = items.map((it) => {
    const name = it.product?.name || it.product_name || it.name || `Product #${it.product_id}`;
    const sku = it.product?.sku || it.sku || '';
    const unit = Number(it.unit_price ?? it.price ?? 0);
    const qty = Number(it.quantity ?? 0);
    return `<tr>
      <td>
        <div class="prod">${escapeHtml(name)}</div>
        ${sku ? `<div class="sku">${escapeHtml(sku)}</div>` : ''}
      </td>
      <td class="num">${qty}</td>
      <td class="num">${fmtMoney(unit)}</td>
      <td class="num">${fmtMoney(unit * qty)}</td>
    </tr>`;
  }).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice · Order #${escapeHtml(order.id)} · Stockwell</title>
<style>
  @page { margin: 24mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #fff; }
  .invoice { max-width: 800px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0f172a; margin-bottom: 32px; }
  .brand { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; letter-spacing: -0.01em; }
  .brand .dot { color: #fbbf24; }
  .brand-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: #64748b; margin-top: 6px; }
  .meta { text-align: right; font-size: 13px; color: #334155; }
  .meta .label { color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; margin-bottom: 2px; }
  .meta .id { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 10px; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; background: #fef3c7; color: #78350f; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
  .block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #94a3b8; margin: 0 0 8px; font-weight: 600; }
  .block p { margin: 2px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; padding: 12px 8px; border-bottom: 1px solid #e2e1da; }
  td { padding: 14px 8px; border-bottom: 1px solid #ecebe5; font-size: 14px; vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
  .prod { font-weight: 600; }
  .sku { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; color: #64748b; letter-spacing: 0.04em; margin-top: 2px; }
  .totals { margin-top: 24px; display: flex; justify-content: flex-end; }
  .totals table { width: 280px; }
  .totals td { border: none; padding: 6px 0; font-size: 14px; }
  .totals td.label { color: #64748b; }
  .totals td.num { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }
  .totals tr.grand td { padding-top: 14px; border-top: 2px solid #0f172a; font-size: 18px; font-weight: 700; }
  .footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid #e2e1da; text-align: center; font-size: 12px; color: #94a3b8; }
  .actions { text-align: center; margin-bottom: 24px; }
  .actions button { padding: 10px 20px; border: 1px solid #0f172a; background: #0f172a; color: #fff; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
  @media print { .actions { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="actions"><button onclick="window.print()">Print invoice</button></div>
<div class="invoice">
  <div class="top">
    <div>
      <div class="brand">Stockwell<span class="dot">.</span></div>
      <div class="brand-tag">Operations · Inventory &amp; Orders</div>
    </div>
    <div class="meta">
      <div class="label">Invoice</div>
      <div class="id">#${escapeHtml(order.id)}</div>
      <div class="label">Issued</div>
      <div>${escapeHtml(created)}</div>
      <div style="margin-top:10px;"><span class="status">${escapeHtml(status)}</span></div>
    </div>
  </div>
  <div class="grid">
    <div class="block">
      <h3>Billed to</h3>
      <p><strong>${escapeHtml(customerName)}</strong></p>
      ${customerEmail ? `<p>${escapeHtml(customerEmail)}</p>` : ''}
      ${customerPhone ? `<p>${escapeHtml(customerPhone)}</p>` : ''}
    </div>
    <div class="block">
      <h3>From</h3>
      <p><strong>Stockwell Operations</strong></p>
      <p>warehouse@stockwell.example</p>
      <p>+1 555 010 0100</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:32px;">No line items recorded.</td></tr>'}
    </tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td class="label">Subtotal</td><td class="num">${fmtMoney(subtotal)}</td></tr>
      ${tax > 0.005 ? `<tr><td class="label">Tax &amp; fees</td><td class="num">${fmtMoney(tax)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td class="num">${fmtMoney(total)}</td></tr>
    </table>
  </div>
  <div class="footer">
    Thank you for your business. This invoice was generated by Stockwell on ${escapeHtml(new Date().toLocaleString('en-US'))}.
  </div>
</div>
<script>setTimeout(function(){ window.focus(); }, 100);</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function OrderDetails({ order }) {
  if (!order) return <div className="state"><div className="state__title">Loading…</div></div>;
  const items = order.items || order.order_items || [];
  return (
    <div>
      <div className="order-detail-meta">
        <div className="order-detail-meta__item"><dt>Order ID</dt><dd className="text-mono">#{order.id}</dd></div>
        <div className="order-detail-meta__item"><dt>Customer</dt><dd>{order.customer_name || order.customer?.full_name || '—'}</dd></div>
        <div className="order-detail-meta__item"><dt>Status</dt><dd>{statusBadge(order.status)}</dd></div>
        <div className="order-detail-meta__item"><dt>Created</dt><dd>{fmtDate(order.created_at || order.date)}</dd></div>
      </div>
      <h3 style={{ marginBottom: 12 }}>Items</h3>
      {items.length === 0 ? (
        <div className="muted">No items recorded.</div>
      ) : (
        <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-md)' }}>
          <table className="table">
            <thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Unit price</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody>
              {items.map((it, i) => {
                const unit = it.unit_price ?? it.price ?? 0;
                const qty = it.quantity ?? 0;
                const name = it.product?.name || it.product_name || it.name || `Product #${it.product_id}`;
                return (
                  <tr key={it.id ?? i}>
                    <td className="product-name">{name}</td>
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
      <div className="order-total"><span className="order-total__label">Order total</span><span className="order-total__value"><strong>{fmtMoney(order.total_amount ?? order.total)}</strong></span></div>
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const loadOrders = () => getOrders().then(setOrders).catch((e) => toast.error(`Could not load orders: ${e.message}`));

  const loadAll = async () => {
    setLoading(true);
    try { await Promise.all([loadOrders(), getCustomers().then(setCustomers).catch(() => {}), getProducts().then(setProducts).catch(() => {})]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) =>
      String(o.id).includes(q) ||
      (o.customer_name || o.customer?.full_name || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const openCreate = async () => {
    try { const [cs, ps] = await Promise.all([getCustomers(), getProducts()]); setCustomers(cs); setProducts(ps); }
    catch (e) { toast.error(`Could not prepare order form: ${e.message}`); return; }
    setCreateOpen(true);
  };

  const handleCreate = async (payload) => {
    setSubmitting(true);
    try {
      await createOrder(payload);
      toast.success('Order created');
      setCreateOpen(false);
      await loadOrders();
    } catch (e) { toast.error(e.message || 'Could not create order'); }
    finally { setSubmitting(false); }
  };

  const openDetails = async (order) => {
    setDetailOpen(true);
    setLoadingDetail(true);
    setDetail(order);
    try { const full = await getOrder(order.id); setDetail(full); }
    catch (e) { toast.error(`Could not load order: ${e.message}`); }
    finally { setLoadingDetail(false); }
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
    } catch (e) { toast.error(e.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

  const handleExport = () => {
    downloadCSV(orders, 'orders-export', [
      { label: 'Order ID', accessor: (r) => `#${r.id}` },
      { label: 'Customer', accessor: (r) => r.customer_name || r.customer?.full_name || '' },
      { label: 'Total', accessor: (r) => r.total_amount ?? r.total ?? 0 },
      { label: 'Status', accessor: (r) => r.status || '' },
      { label: 'Items', accessor: (r) => r.item_count ?? r.items?.length ?? 0 },
      { label: 'Created', accessor: (r) => r.created_at || r.date || '' },
    ]);
    toast.success('Orders exported to CSV');
  };

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <div className="page-header__meta">Fulfillment · 04</div>
          <h1 className="page-header__title">Orders <em>in motion</em></h1>
          <p className="page-header__sub">Compose new orders, track shipments, and manage fulfillment end-to-end.</p>
        </div>
        <button className="btn btn--accent" onClick={openCreate}><span className="btn__plus">+</span> Create order</button>
      </header>

      <section className="card card--flush">
        <div className="card-toolbar">
          <div className="card-toolbar__left">
            <div>
              <div className="card__eyebrow">All orders</div>
              <h2 className="card__title" style={{ fontSize: '1rem' }}>{loading ? '…' : `${filtered.length} of ${orders.length} order${orders.length === 1 ? '' : 's'}`}</h2>
            </div>
          </div>
          <div className="card-toolbar__right">
            <div className="search-bar">
              <span className="search-bar__icon">⌕</span>
              <input className="search-bar__input" placeholder="Search ID, customer, status…  (⌘K)" value={search} onChange={(e) => setSearch(e.target.value)} data-shortcut="search" />
              {search && <button className="search-bar__clear" onClick={() => setSearch('')}>×</button>}
            </div>
            {orders.length > 0 && <button className="export-btn" onClick={handleExport}>↓ CSV</button>}
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : orders.length === 0 ? (
          <div className="state">
            <div className="state__icon">◇</div>
            <div className="state__title">No orders yet</div>
            <p>Create your first order to start tracking fulfilment.</p>
            <div className="mt-4"><button className="btn btn--primary" onClick={openCreate}>Create order</button></div>
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
                  <th>ID</th>
                  <th>Customer</th>
                  <th className="text-right">Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="row-clickable" onClick={() => openDetails(o)}>
                    <td className="text-mono" style={{ fontWeight: 600 }}>#{o.id}</td>
                    <td className="product-name">{o.customer_name || o.customer?.full_name || `Customer #${o.customer_id}`}</td>
                    <td className="num text-right">{fmtMoney(o.total_amount ?? o.total)}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{fmtDate(o.created_at || o.date)}</td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openDetails(o)}>View</button>
                      <button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDel(o)}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={createOpen} onClose={() => !submitting && setCreateOpen(false)} title="Create order" wide>
        <OrderBuilder customers={customers} products={products} submitting={submitting} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `Order #${detail.id}` : 'Order details'} wide>
        {loadingDetail && !detail ? (
          <div className="state"><div className="state__title">Loading…</div></div>
        ) : (
          <>
            <OrderDetails order={detail} />
            {detail && <OrderStatusActions order={detail} onStatusChange={() => { openDetails(detail); loadOrders(); }} />}
            <div className="form-actions">
              <button className="btn btn--secondary" onClick={() => setDetailOpen(false)}>Close</button>
              {detail && (
                <button className="btn btn--ghost" onClick={() => printInvoice(detail)}>🖨 Print invoice</button>
              )}
              {detail && ['confirmed', 'shipped'].includes((detail.status || '').toLowerCase()) && (
                <button className="btn btn--danger" onClick={() => setConfirmDel(detail)}>Cancel order</button>
              )}
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!confirmDel} title="Cancel order" message={confirmDel ? `Order #${confirmDel.id} will be cancelled. This cannot be undone.` : ''} confirmLabel="Cancel order" cancelLabel="Keep" onConfirm={handleDelete} onCancel={() => !deleting && setConfirmDel(null)} busy={deleting} />
    </div>
  );
}

export default Orders;
