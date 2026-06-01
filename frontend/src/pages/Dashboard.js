import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, createProduct, createCustomer } from '../services/api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { SkeletonCards, SkeletonChart, SkeletonList } from '../components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const STATUS_COLORS = {
  confirmed: '#fbbf24',
  shipped: '#0284c7',
  delivered: '#16a34a',
  cancelled: '#dc2626',
};

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n));

const fmtMoneyExact = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(Number(n));

const fmtDateShort = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function statusBadge(status) {
  const s = (status || '').toString().toLowerCase();
  if (s === 'delivered') return <span className="badge badge--success">{status}</span>;
  if (s === 'shipped') return <span className="badge badge--info">{status}</span>;
  if (s === 'confirmed') return <span className="badge badge--accent">{status}</span>;
  if (['cancelled', 'canceled'].includes(s)) return <span className="badge badge--danger">{status}</span>;
  return <span className="badge badge--neutral">{status || '—'}</span>;
}

function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target == null || Number.isNaN(Number(target))) { setCount(0); return undefined; }
    const num = Number(target);
    const start = performance.now();
    let raf;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(num * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
      else setCount(num);
    };
    raf = requestAnimationFrame(animate);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return count;
}

function StatCard({ index, label, value, hint, accent = false, warning = false, money = false }) {
  const count = useCountUp(value);
  const display = money
    ? fmtMoney(count)
    : Math.round(count).toLocaleString('en-US');
  const cls = ['stat-card'];
  if (accent) cls.push('stat-card--accent');
  if (warning) cls.push('stat-card--warning');
  return (
    <div className={cls.join(' ')}>
      <div className="stat-card__label">
        <span className="stat-card__label-num">{String(index).padStart(2, '0')}</span>
        {label}
      </div>
      <div className="stat-card__value">{value == null ? '—' : display}</div>
      <div className="stat-card__delta">{hint}</div>
    </div>
  );
}

function QuickActions({ onAddProduct, onAddCustomer }) {
  const navigate = useNavigate();
  return (
    <div className="quick-actions">
      <button className="quick-action quick-action--accent" onClick={() => navigate('/orders')}>
        <span className="quick-action__icon" aria-hidden="true">+</span>
        <span className="quick-action__label">Create order</span>
        <span className="quick-action__chevron" aria-hidden="true">→</span>
      </button>
      <button className="quick-action quick-action--primary" onClick={onAddProduct}>
        <span className="quick-action__icon" aria-hidden="true">▢</span>
        <span className="quick-action__label">Add product</span>
        <span className="quick-action__chevron" aria-hidden="true">→</span>
      </button>
      <button className="quick-action quick-action--secondary" onClick={onAddCustomer}>
        <span className="quick-action__icon" aria-hidden="true">◯</span>
        <span className="quick-action__label">Add customer</span>
        <span className="quick-action__chevron" aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  const handleAddProduct = async (form) => {
    setSubmittingProduct(true);
    try {
      await createProduct(form);
      toast.success(`Created "${form.name}"`);
      setShowProductModal(false);
      // reload dashboard data
      const d = await getDashboard();
      setData(d);
    } catch (e) {
      toast.error(e.message || 'Failed to create product');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleAddCustomer = async (form) => {
    setSubmittingCustomer(true);
    try {
      await createCustomer(form);
      toast.success(`Added "${form.full_name}"`);
      setShowCustomerModal(false);
      const d = await getDashboard();
      setData(d);
    } catch (e) {
      toast.error(e.message || 'Failed to create customer');
    } finally {
      setSubmittingCustomer(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDashboard()
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) toast.error(`Could not load dashboard: ${e.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowStock = data?.low_stock_products || [];
  const recentOrders = data?.recent_orders || [];
  const revenueTrend = data?.revenue_trend || [];
  const ordersByStatus = data?.orders_by_status || {};

  const inventoryChartData = data
    ? [
        { name: 'Products', value: data.total_products ?? 0, fill: '#6366f1' },
        { name: 'Customers', value: data.total_customers ?? 0, fill: '#fbbf24' },
        { name: 'Orders', value: data.total_orders ?? 0, fill: '#16a34a' },
      ]
    : [];

  const pieData = useMemo(() => {
    return Object.entries(ordersByStatus)
      .filter(([, v]) => Number(v) > 0)
      .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: Number(v), key: k }));
  }, [ordersByStatus]);

  const lineData = useMemo(() => {
    return revenueTrend.map((p) => ({ date: fmtDateShort(p.date), revenue: Number(p.revenue || 0) }));
  }, [revenueTrend]);

  return (
    <>
    <div className="container">
      <header className="page-header">
        <div>
          <div className="page-header__meta">Overview · {TODAY}</div>
          <h1 className="page-header__title">
            Today at <em>a glance</em>
          </h1>
          <p className="page-header__sub">
            A real-time snapshot of inventory, customers, and orders moving through the system.
          </p>
        </div>
      </header>

      <QuickActions onAddProduct={() => setShowProductModal(true)} onAddCustomer={() => setShowCustomerModal(true)} />

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="stat-grid">
          <StatCard index={1} label="Products" value={data?.total_products ?? 0} hint="Active SKUs in catalog" />
          <StatCard index={2} label="Customers" value={data?.total_customers ?? 0} hint="Registered accounts" />
          <StatCard index={3} label="Revenue" value={data?.total_revenue ?? 0} hint="All-time gross" accent money />
          <StatCard index={4} label="Low stock" value={lowStock.length} hint={lowStock.length ? 'Action required' : 'Inventory healthy'} warning={lowStock.length > 0} />
        </div>
      )}

      <div className="chart-section">
        <div className="chart-container">
            <div className="card__eyebrow" style={{ marginBottom: 8 }}>Status</div>
            <h3 className="chart-title">Orders by status</h3>
            {loading ? (
              <SkeletonChart height={260} />
            ) : pieData.length === 0 ? (
              <div className="chart-empty">
                <div className="chart-empty__icon">◇</div>
                <div className="chart-empty__title">No orders yet</div>
                <p>Status breakdown appears once orders are created.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="var(--bg-elev)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elev)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      boxShadow: 'var(--shadow-md)',
                      fontSize: 13,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: 'var(--ink-2)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
      </div>

      <div className="chart-section">
        <div className="chart-container">
            <div className="row row--between" style={{ marginBottom: 8 }}>
              <div>
                <div className="card__eyebrow" style={{ marginBottom: 4 }}>Activity</div>
                <h3 className="chart-title" style={{ marginBottom: 0 }}>Recent orders</h3>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => navigate('/orders')}>View all →</button>
            </div>
            {loading ? (
              <SkeletonList rows={5} />
            ) : recentOrders.length === 0 ? (
              <div className="chart-empty">
                <div className="chart-empty__icon">◇</div>
                <div className="chart-empty__title">No orders yet</div>
                <p>Newly created orders will show up here.</p>
              </div>
            ) : (
              <div className="recent-orders">
                {recentOrders.slice(0, 5).map((o) => (
                  <button
                    key={o.id}
                    className="recent-order"
                    onClick={() => navigate('/orders')}
                  >
                    <div className="recent-order__main">
                      <div className="recent-order__id">#{o.id}</div>
                      <div className="recent-order__customer">{o.customer_name || `Customer #${o.customer_id}`}</div>
                      <div className="recent-order__date">{fmtDateShort(o.created_at)}</div>
                    </div>
                    <div className="recent-order__side">
                      <div className="recent-order__total">{fmtMoneyExact(o.total_amount)}</div>
                      <div>{statusBadge(o.status)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
      </div>

      <section className="card card--flush">
        <div className="card__header">
          <div>
            <div className="card__eyebrow">Inventory alert</div>
            <h2 className="card__title">Low stock — quantity ≤ 10</h2>
          </div>
          <div className="low-stock-meta">
            {loading ? 'loading…' : `${lowStock.length} item${lowStock.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <SkeletonList rows={4} />
          </div>
        ) : lowStock.length === 0 ? (
          <div className="state">
            <div className="state__icon">✓</div>
            <div className="state__title">Everything's stocked</div>
            <p>No products are at or below the threshold.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="text-right">Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className="product-name">{p.name}</td>
                    <td className="product-sku">{p.sku}</td>
                    <td className="num text-right">{p.quantity}</td>
                    <td>
                      {p.quantity === 0 ? (
                        <span className="badge badge--danger">Out of stock</span>
                      ) : (
                        <span className="badge badge--warning">Low</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>

      <Modal isOpen={showProductModal} onClose={() => !submittingProduct && setShowProductModal(false)} title="Quick add product">
        <QuickProductForm submitting={submittingProduct} onSubmit={handleAddProduct} onCancel={() => setShowProductModal(false)} />
      </Modal>

      <Modal isOpen={showCustomerModal} onClose={() => !submittingCustomer && setShowCustomerModal(false)} title="Quick add customer">
        <QuickCustomerForm submitting={submittingCustomer} onSubmit={handleAddCustomer} onCancel={() => setShowCustomerModal(false)} />
      </Modal>
    </>
  );
}

function QuickProductForm({ onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({ name: '', sku: '', price: '', quantity: '' });
  const [errors, setErrors] = useState({});
  const update = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined })); };
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    const price = parseFloat(form.price);
    if (form.price === '' || Number.isNaN(price)) errs.price = 'Price is required';
    else if (price <= 0) errs.price = 'Must be > 0';
    const qty = parseInt(form.quantity, 10);
    if (form.quantity === '' || Number.isNaN(qty)) errs.quantity = 'Quantity is required';
    else if (qty < 0) errs.quantity = 'Cannot be negative';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ name: form.name.trim(), sku: form.sku.trim(), price: parseFloat(form.price), quantity: parseInt(form.quantity, 10) });
  };
  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group"><label className="form-group__label">Product name</label><input className={`input ${errors.name ? 'input--error' : ''}`} value={form.name} onChange={update('name')} placeholder="e.g. Linen Apron" autoFocus />{errors.name && <div className="form-group__error">{errors.name}</div>}</div>
      <div className="form-group"><label className="form-group__label">SKU</label><input className={`input ${errors.sku ? 'input--error' : ''}`} value={form.sku} onChange={update('sku')} placeholder="e.g. LIN-APR-001" />{errors.sku && <div className="form-group__error">{errors.sku}</div>}</div>
      <div className="form-row">
        <div className="form-group"><label className="form-group__label">Price</label><input type="number" step="0.01" min="0" className={`input ${errors.price ? 'input--error' : ''}`} value={form.price} onChange={update('price')} placeholder="0.00" />{errors.price && <div className="form-group__error">{errors.price}</div>}</div>
        <div className="form-group"><label className="form-group__label">Quantity</label><input type="number" min="0" step="1" className={`input ${errors.quantity ? 'input--error' : ''}`} value={form.quantity} onChange={update('quantity')} placeholder="0" />{errors.quantity && <div className="form-group__error">{errors.quantity}</div>}</div>
      </div>
      <div className="form-actions"><button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>Cancel</button><button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create product'}</button></div>
    </form>
  );
}

function QuickCustomerForm({ onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const update = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined })); };
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Invalid email';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({ full_name: form.full_name.trim(), email: form.email.trim(), phone: form.phone.trim() });
  };
  return (
    <form onSubmit={submit} noValidate>
      <div className="form-group"><label className="form-group__label">Full name</label><input className={`input ${errors.full_name ? 'input--error' : ''}`} value={form.full_name} onChange={update('full_name')} placeholder="e.g. Amelia Hart" autoFocus />{errors.full_name && <div className="form-group__error">{errors.full_name}</div>}</div>
      <div className="form-group"><label className="form-group__label">Email</label><input type="email" className={`input ${errors.email ? 'input--error' : ''}`} value={form.email} onChange={update('email')} placeholder="amelia@example.com" />{errors.email && <div className="form-group__error">{errors.email}</div>}</div>
      <div className="form-group"><label className="form-group__label">Phone</label><input type="tel" className={`input ${errors.phone ? 'input--error' : ''}`} value={form.phone} onChange={update('phone')} placeholder="+1 555 123 4567" />{errors.phone && <div className="form-group__error">{errors.phone}</div>}</div>
      <div className="form-actions"><button type="button" className="btn btn--secondary" onClick={onCancel} disabled={submitting}>Cancel</button><button type="submit" className="btn btn--primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add customer'}</button></div>
    </form>
  );
}

export default Dashboard;
