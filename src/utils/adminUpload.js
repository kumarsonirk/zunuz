// Upload an image through the admin API; resolves to its public URL.
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

export async function uploadAdminImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API_BASE}/api/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('zunuz_admin_token')}` }, body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).url;
}
