const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const PUBLIC_PATHS = ['/auth/login', '/auth/register'];

function authHeaders(path) {
  const headers = {};
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (token && !isPublic) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function handleUnauthorized() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch { /* noop */ }
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
    window.location.assign('/login');
  }
}

async function handle(res) {
  if (res.status === 401) {
    handleUnauthorized();
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    let detail;
    try {
      const data = await res.json();
      detail = data.detail || data.message || JSON.stringify(data);
    } catch {
      detail = res.statusText;
    }
    const err = new Error(detail || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function request(path, { method = 'GET', body, extraHeaders } = {}) {
  const headers = { ...authHeaders(path), ...(extraHeaders || {}) };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return fetch(`${API_BASE}${path}`, init).then(handle);
}

function get(path) { return request(path, { method: 'GET' }); }
function post(path, body) { return request(path, { method: 'POST', body }); }
function put(path, body) { return request(path, { method: 'PUT', body }); }
function del(path) { return request(path, { method: 'DELETE' }); }
function patch(path, body) { return request(path, { method: 'PATCH', body }); }

/* Products (list returns {items, total, skip, limit} → unwrap) */
export const getProducts = () => get('/products').then((r) => r.items || r);
export const getProduct = (id) => get(`/products/${id}`);
export const createProduct = (data) => post('/products', data);
export const updateProduct = (id, data) => put(`/products/${id}`, data);
export const deleteProduct = (id) => del(`/products/${id}`);

/* Customers */
export const getCustomers = () => get('/customers').then((r) => r.items || r);
export const getCustomer = (id) => get(`/customers/${id}`);
export const createCustomer = (data) => post('/customers', data);
export const deleteCustomer = (id) => del(`/customers/${id}`);

/* Orders */
export const getOrders = () => get('/orders').then((r) => r.items || r);
export const getOrder = (id) => get(`/orders/${id}`);
export const createOrder = (data) => post('/orders', data);
export const deleteOrder = (id) => del(`/orders/${id}`);

/* Dashboard */
export const getDashboard = () => get('/dashboard');

/* Orders - status update */
export const updateOrderStatus = (id, status) => patch(`/orders/${id}/status`, { status });

/* =============================================
   CSV Export Utility
   ============================================= */
export function downloadCSV(data, filename, columns) {
  if (!data || data.length === 0) return;
  const headers = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => {
        let val = c.accessor(row);
        if (val == null) val = '';
        val = String(val).replace(/"/g, '""');
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`;
        }
        return val;
      })
      .join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/* Legacy aliases */
export const fetchProducts = getProducts;
export const fetchCustomers = getCustomers;
export const fetchOrders = getOrders;

const api = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getCustomers, getCustomer, createCustomer, deleteCustomer,
  getOrders, getOrder, createOrder, deleteOrder, updateOrderStatus,
  getDashboard, downloadCSV,
};
export default api;
