const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

async function handle(res) {
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

function get(path) {
  return fetch(`${API_BASE}${path}`).then(handle);
}
function post(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle);
}
function put(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle);
}
function del(path) {
  return fetch(`${API_BASE}${path}`, { method: 'DELETE' }).then(handle);
}

/* Products */
export const getProducts = () => get('/products');
export const getProduct = (id) => get(`/products/${id}`);
export const createProduct = (data) => post('/products', data);
export const updateProduct = (id, data) => put(`/products/${id}`, data);
export const deleteProduct = (id) => del(`/products/${id}`);

/* Customers */
export const getCustomers = () => get('/customers');
export const getCustomer = (id) => get(`/customers/${id}`);
export const createCustomer = (data) => post('/customers', data);
export const deleteCustomer = (id) => del(`/customers/${id}`);

/* Orders */
export const getOrders = () => get('/orders');
export const getOrder = (id) => get(`/orders/${id}`);
export const createOrder = (data) => post('/orders', data);
export const deleteOrder = (id) => del(`/orders/${id}`);

/* Dashboard */
export const getDashboard = () => get('/dashboard');

/* Legacy aliases (per spec naming) */
export const fetchProducts = getProducts;
export const fetchCustomers = getCustomers;
export const fetchOrders = getOrders;

const api = {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getCustomers, getCustomer, createCustomer, deleteCustomer,
  getOrders, getOrder, createOrder, deleteOrder,
  getDashboard,
};
export default api;
