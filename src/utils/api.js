const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const headers = (isAdmin = false) => {
  const key = isAdmin ? 'zunuz_admin_token' : 'zunuz_customer_token';
  const token = localStorage.getItem(key);
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const handle = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const api = {
  get:    (path, isAdmin = false)        => fetch(`${BASE}${path}`, { headers: headers(isAdmin) }).then(handle),
  post:   (path, body, isAdmin = false)  => fetch(`${BASE}${path}`, { method: 'POST',   headers: headers(isAdmin), body: JSON.stringify(body) }).then(handle),
  put:    (path, body, isAdmin = false)  => fetch(`${BASE}${path}`, { method: 'PUT',    headers: headers(isAdmin), body: JSON.stringify(body) }).then(handle),
  delete: (path, isAdmin = false)        => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers(isAdmin) }).then(handle),
};
