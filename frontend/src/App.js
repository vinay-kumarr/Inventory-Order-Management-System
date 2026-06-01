import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useDarkMode } from './DarkMode';
import { AuthProvider, useAuth } from './AuthContext';

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

function PageTransition({ children }) {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      setVisible(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      prevPath.current = location.pathname;
    } else {
      setVisible(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className={`page-transition ${visible ? 'page-transition--visible' : ''}`}>
      {children}
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="auth-bootstrap">
        <div className="auth-bootstrap__spinner" aria-label="Loading" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function UserFooter() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initials = (user.full_name || user.email || '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="user-card" role="group" aria-label="Current user">
      <div className="user-card__avatar" aria-hidden="true">{initials}</div>
      <div className="user-card__info">
        <div className="user-card__name">{user.full_name || 'Signed in'}</div>
        <div className="user-card__email">{user.email}</div>
      </div>
      <button
        type="button"
        className="user-card__logout"
        onClick={logout}
        aria-label="Sign out"
        title="Sign out"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = (target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

function useGlobalShortcuts() {
  const location = useLocation();
  useEffect(() => {
    const handler = (e) => {
      const target = e.target;

      // Ctrl/Cmd+K — focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.querySelector('[data-shortcut="search"]');
        if (el) {
          el.focus();
          if (typeof el.select === 'function') el.select();
        }
        return;
      }

      // Skip remaining shortcuts when typing
      if (isTypingTarget(target)) return;

      // Escape — close modals (dispatch a custom event Modal listens to via its own handler)
      if (e.key === 'Escape') {
        const closeBtn = document.querySelector('.modal-overlay .modal__close');
        if (closeBtn) closeBtn.click();
        return;
      }

      // N — new product on /products
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (location.pathname.startsWith('/products')) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut:new-product'));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [location.pathname]);
}

function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const { dark, toggle: toggleDark } = useDarkMode();
  useGlobalShortcuts();

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
          <button className="theme-toggle" onClick={toggleDark} aria-label="Toggle dark mode">
            <span className="theme-toggle__icon">{dark ? '☀️' : '🌙'}</span>
            <span className="theme-toggle__label">{dark ? 'Light' : 'Dark'} mode</span>
          </button>
          <UserFooter />
        </div>
      </aside>

      <div className={`mobile-bar ${navOpen ? 'mobile-bar--open' : ''}`}>
        <div className="mobile-bar__brand">
          <div className="brand-mark brand-mark--sm" aria-hidden="true">
            <span /><span /><span />
          </div>
          <span>Stockwell<span style={{ color: 'var(--accent)' }}>.</span></span>
        </div>
        <div className="mobile-bar__right">
          <button className="mobile-theme-btn" onClick={toggleDark} aria-label="Toggle dark mode">
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            className="mobile-bar__toggle"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {navOpen && <div className="mobile-overlay" onClick={() => setNavOpen(false)} />}

      <main className="main">
        <Routes>
          <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/products" element={<PageTransition><Products /></PageTransition>} />
          <Route path="/customers" element={<PageTransition><Customers /></PageTransition>} />
          <Route path="/orders" element={<PageTransition><Orders /></PageTransition>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
