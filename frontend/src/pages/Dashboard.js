import React, { useEffect, useState } from 'react';
import { getDashboard } from '../services/api';
import { useToast } from '../components/Toast';

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

function StatCard({ index, label, value, hint, accent = false, warning = false, loading }) {
  const cls = ['stat-card'];
  if (accent) cls.push('stat-card--accent');
  if (warning) cls.push('stat-card--warning');
  return (
    <div className={cls.join(' ')}>
      <div className="stat-card__label">
        <span className="stat-card__label-num">{String(index).padStart(2, '0')}</span>
        {label}
      </div>
      <div className="stat-card__value">
        {loading ? <span className="skeleton" style={{ width: 80, height: 44 }} /> : value}
      </div>
      <div className="stat-card__delta">{hint}</div>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDashboard()
      .then((d) => { if (active) setData(d); })
      .catch((e) => toast.error(`Could not load dashboard: ${e.message}`))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowStock = data?.low_stock_products || [];

  return (
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

      <div className="stat-grid">
        <StatCard
          index={1}
          label="Products"
          value={data?.total_products ?? '—'}
          hint="Active SKUs in catalog"
          loading={loading}
        />
        <StatCard
          index={2}
          label="Customers"
          value={data?.total_customers ?? '—'}
          hint="Registered accounts"
          loading={loading}
        />
        <StatCard
          index={3}
          label="Orders"
          value={data?.total_orders ?? '—'}
          hint="All-time order count"
          accent
          loading={loading}
        />
        <StatCard
          index={4}
          label="Low stock"
          value={lowStock.length}
          hint={lowStock.length ? 'Action required' : 'Inventory healthy'}
          warning={lowStock.length > 0}
          loading={loading}
        />
      </div>

      <section className="card card--flush">
        <div className="card__header">
          <div>
            <div className="card__eyebrow">Inventory alert</div>
            <h2 className="card__title">Low stock — quantity ≤ 5</h2>
          </div>
          <div className="low-stock-meta">
            {loading ? 'loading…' : `${lowStock.length} item${lowStock.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {loading ? (
          <div className="state"><div className="state__title">Fetching inventory…</div></div>
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
  );
}

export default Dashboard;
