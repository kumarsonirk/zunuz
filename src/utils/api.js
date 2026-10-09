const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const headers = (isAdmin = false) => {
  const key = isAdmin ? 'zunuz_admin_token' : 'zunuz_customer_token';
  const token = localStorage.getItem(key);
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const handle = (path, isAdmin) => async (res) => {
  const data = await res.json();
  // Expired / invalid admin session: the admin pages used to swallow this
  // and just show empty lists — send them back to the admin login instead
  // (not for the login call itself, whose 401 means "wrong password").
  if (res.status === 401 && isAdmin && !path.startsWith('/admin/auth/')) {
    localStorage.removeItem('zunuz_admin_token');
    if (!window.location.pathname.startsWith('/admin/login')) window.location.replace('/admin/login?expired=1');
  }
  // Customer session revoked mid-visit (password reset elsewhere, expired):
  // drop it now and tell AuthContext, rather than failing quietly until the
  // next page load. /auth/* 401s mean "wrong password" etc., not this.
  if (res.status === 401 && !isAdmin && !path.startsWith('/auth/') && localStorage.getItem('zunuz_customer_token')) {
    localStorage.removeItem('zunuz_customer_token');
    window.dispatchEvent(new Event('zunuz:customer-signed-out'));
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  get:    (path, isAdmin = false)        => fetch(`${BASE}${path}`, { headers: headers(isAdmin) }).then(handle(path, isAdmin)),
  post:   (path, body, isAdmin = false)  => fetch(`${BASE}${path}`, { method: 'POST',   headers: headers(isAdmin), body: JSON.stringify(body) }).then(handle(path, isAdmin)),
  put:    (path, body, isAdmin = false)  => fetch(`${BASE}${path}`, { method: 'PUT',    headers: headers(isAdmin), body: JSON.stringify(body) }).then(handle(path, isAdmin)),
  delete: (path, isAdmin = false)        => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers(isAdmin) }).then(handle(path, isAdmin)),
};
