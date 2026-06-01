import React, { useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', code: '01', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/products', label: 'Products', code: '02', icon: 'M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4' },
  { to: '/customers', label: 'Customers', code: '03', icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM2 21a8 8 0 0116 0' },
  { to: '/orders', label: 'Orders', code: '04', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
];

function Icon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function App() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="brand-text">
            <div className="brand-text__eyebrow">Operations</div>
            <div className="brand-text__name">Stockwell<span className="brand-text__dot">.</span></div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__label">Navigate</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              <span className="nav-link__code">{item.code}</span>
              <span className="nav-link__icon"><Icon d={item.icon} /></span>
              <span className="nav-link__label">{item.label}</span>
              <span className="nav-link__chevron" aria-hidden="true">→</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__footer-card">
            <div className="sidebar__footer-eyebrow">System</div>
            <div className="sidebar__footer-status">
              <span className="status-dot" /> All services operational
            </div>
          </div>
        </div>
      </aside>

      <div className={`mobile-bar ${navOpen ? 'mobile-bar--open' : ''}`}>
        <div className="mobile-bar__brand">
          <div className="brand-mark brand-mark--sm" aria-hidden="true">
            <span /><span /><span />
          </div>
          <span>Stockwell<span style={{ color: 'var(--accent)' }}>.</span></span>
        </div>
        <button
          className="mobile-bar__toggle"
          onClick={() => setNavOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          <span /><span /><span />
        </button>
      </div>

      {navOpen && <div className="mobile-overlay" onClick={() => setNavOpen(false)} />}

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
