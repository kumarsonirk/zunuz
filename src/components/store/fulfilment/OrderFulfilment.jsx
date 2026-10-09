import { useRef, useState } from 'react';
import { Truck, ExternalLink, RotateCcw, AlertTriangle, Camera, Video, X, Loader2, Check, Clock } from 'lucide-react';
import { cardCls, primaryBtnCls, ghostBtnCls, BtnSweep, fieldCls } from '../StoreShell';
import { formatPrice } from '../../../store/catalogConfig';

// Customer-side fulfilment cards for the My Orders drawer: tracking,
// refund status, and "Report a problem" (returns / replacements).

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');

const REPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
// When the 24-hour reporting window closes (null if not delivered or the
// delivery time is unknown — same rule as the server).
function reportDeadline(order) {
  if (order.status !== 'DELIVERED' || !order.deliveredAt) return null;
  return new Date(new Date(order.deliveredAt).getTime() + REPORT_WINDOW_MS);
}

export function TrackingCard({ order }) {
  if (!order.trackingNumber && !order.shippedAt) return null;
  return (
    <section className={`p-5 ${cardCls}`}>
      <h3 className="m-0 mb-3 flex items-center gap-2 text-[17px] font-bold"><Truck size={17} className="text-[#1A6FE8]" /> Tracking</h3>
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 font-['Inter',sans-serif] text-[14px] max-[420px]:grid-cols-1">
        {order.courier && <div><dt className="text-[12px] text-[#111110]/55">Courier</dt><dd className="m-0 font-semibold">{order.courier}</dd></div>}
        {order.trackingNumber && <div><dt className="text-[12px] text-[#111110]/55">Tracking number</dt><dd className="m-0 font-semibold break-all">{order.trackingNumber}</dd></div>}
        {order.shippedAt && <div><dt className="text-[12px] text-[#111110]/55">Shipped</dt><dd className="m-0 font-semibold">{fmt(order.shippedAt)}</dd></div>}
        {order.deliveredAt && <div><dt className="text-[12px] text-[#111110]/55">Delivered</dt><dd className="m-0 font-semibold text-[#1E8A4C]">{fmt(order.deliveredAt)}</dd></div>}
      </dl>
      {!order.trackingNumber && <p className="m-0 mt-3 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">Tracking details will appear here as soon as the courier shares them.</p>}
      {order.trackingUrl && (
        <a href={order.trackingUrl} target="_blank" rel="noreferrer" className={`${primaryBtnCls} mt-4 w-full py-3 text-[15px]`}>
          <BtnSweep /> Track package <ExternalLink size={16} />
        </a>
      )}
    </section>
  );
}

export function RefundCard({ order }) {
  if (!['PROCESSED', 'PENDING'].includes(order.refundStatus) || !order.refundAmount) return null;
  const done = order.refundStatus === 'PROCESSED';
  return (
    <section className={`p-5 ${cardCls}`}>
      <h3 className="m-0 mb-2 flex items-center gap-2 text-[17px] font-bold"><RotateCcw size={17} className="text-[#1E8A4C]" /> Refund</h3>
      <p className="m-0 font-['Inter',sans-serif] text-[14px] text-[#111110]/75">
        <b className="text-[#111110]">{formatPrice(order.refundAmount)}</b> {done ? 'refunded' : 'refund in progress'}{order.refundedAt && ` · ${fmt(order.refundedAt)}`}.
        {' '}{order.paymentMethod === 'RAZORPAY' ? 'It goes back to your original payment method and usually shows up within 5–7 business days.' : order.paymentMethod === 'CREDITS' ? 'It goes back to your ZUNUZ Credits.' : 'Contact us if you haven\'t received it.'}
      </p>
    </section>
  );
}

const STATUS = {
  PENDING: { label: 'Under review', cls: 'bg-[#FFF0B8] text-[#8A6A00]', text: 'We\'ve got your request and will reply within 1–2 business days.' },
  APPROVED: { label: 'Approved', cls: 'bg-[#D6E6FF] text-[#1A5BC4]', text: null },
  REJECTED: { label: 'Not approved', cls: 'bg-[#FFE0EA] text-[#B4123E]', text: 'Unfortunately we couldn\'t approve this request.' },
  COMPLETED: { label: 'Completed', cls: 'bg-[#E8F7EE] text-[#1E8A4C]', text: null },
};
const TYPE = { REPLACEMENT: 'Replacement', REFUND: 'Refund' };
const REASONS = ['Damaged', 'Defective', 'Wrong item', 'Missing item', 'Other'];

function RequestStatus({ request }) {
  const s = STATUS[request.status] || STATUS.PENDING;
  let text = s.text;
  if (request.status === 'APPROVED') text = request.type === 'REFUND' ? 'Your refund will be sent to your original payment method shortly.' : 'We\'re preparing your replacement — you\'ll get tracking details by email.';
  if (request.status === 'COMPLETED') text = request.type === 'REFUND' ? 'Your refund has been completed.' : 'Your replacement has been sent.';
  return (
    <section className={`p-5 ${cardCls}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-[17px] font-bold"><RotateCcw size={17} className="text-[#FF3D8B]" /> {TYPE[request.type]} request #{request.id}</h3>
        <span className={`rounded-full px-3 py-1 font-['Inter',sans-serif] text-[12px] font-bold ${s.cls}`}>{s.label}</span>
      </div>
      <p className="m-0 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">{request.reason} · reported {fmtTime(request.createdAt)}</p>
      {text && <p className="m-0 mt-2 font-['Inter',sans-serif] text-[14px] text-[#111110]/80">{text}</p>}
      {request.adminNote && (
        <p className="m-0 mt-3 rounded-[14px] bg-[#FFF8EE] px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#111110]/85"><b>Note from ZUNUZ:</b> {request.adminNote}</p>
      )}
      {request.media?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {request.media.map((m) => (
            <a key={m.url} href={m.url} target="_blank" rel="noreferrer" className="flex size-12 items-center justify-center overflow-hidden rounded-[10px] bg-[#EFE8DA] text-[#111110]" aria-label={m.kind === 'video' ? 'Open video' : 'Open photo'}>
              {m.kind === 'video' ? <Video size={18} /> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  // Multipart upload — bypasses api.js, which always sends JSON.
  const token = localStorage.getItem('zunuz_customer_token');
  const res = await fetch(`${BASE}/returns/upload`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

const IMG_OK = ['image/jpeg', 'image/png', 'image/webp'];
const VID_OK = ['video/mp4', 'video/quicktime'];

function ReportForm({ order, onCancel, onSubmit }) {
  const [type, setType] = useState('REPLACEMENT');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState([]); // { url, kind, name }
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const photos = media.filter((m) => m.kind === 'image').length;
  const videos = media.length - photos;

  const add = async (files, kind) => {
    setErr('');
    const list = Array.from(files || []);
    const room = kind === 'image' ? 5 - photos : 1 - videos;
    if (list.length > room) setErr(kind === 'image' ? 'You can add up to 5 photos.' : 'You can add one video.');
    for (const f of list.slice(0, Math.max(0, room))) {
      if (kind === 'image' && (!IMG_OK.includes(f.type) || f.size > 5 * 1024 * 1024)) { setErr(`${f.name}: photos must be JPG, PNG or WEBP, up to 5 MB.`); continue; }
      if (kind === 'video' && (!VID_OK.includes(f.type) || f.size > 30 * 1024 * 1024)) { setErr(`${f.name}: videos must be MP4 or MOV, up to 30 MB.`); continue; }
      setUploading((n) => n + 1);
      try {
        const up = await uploadFile(f);
        setMedia((m) => [...m, { url: up.url, kind: up.kind, name: f.name }]);
      } catch (e) { setErr(`${f.name}: ${e.message}`); }
      finally { setUploading((n) => n - 1); }
    }
  };

  const submit = async () => {
    if (!reason) { setErr('Choose what went wrong.'); return; }
    if (description.trim().length < 10) { setErr('Please describe the problem in a few words.'); return; }
    if (!media.length) { setErr('Add at least one photo or your unboxing video.'); return; }
    setBusy(true); setErr('');
    try { await onSubmit({ orderId: order.id, type, reason, description: description.trim(), media: media.map(({ url, kind }) => ({ url, kind })) }); }
    catch (e) { setErr(e.message || 'Could not send your request.'); }
    finally { setBusy(false); }
  };

  const pill = (on) => `cursor-pointer rounded-full border-2 px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors ${on ? 'border-[#111110] bg-[#111110] text-white' : 'border-[#111110]/12 bg-white text-[#111110] hover:border-[#111110]'}`;

  return (
    <section className={`p-5 ${cardCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`} aria-labelledby="rp-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="rp-title" className="m-0 text-[17px] font-bold">Report a problem</h3>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110]/6 text-[#111110] hover:bg-[#111110]/12"><X size={16} /></button>
      </div>
      <div className="flex flex-col gap-4 font-['Inter',sans-serif]">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold text-[#111110]/70">What would you like?</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {Object.entries(TYPE).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)} className={pill(type === k)}>{l}</button>)}
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold text-[#111110]/70">What went wrong?</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {REASONS.map((r) => <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={pill(reason === r)}>{r}</button>)}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-[#111110]/70">Tell us more</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Which item, and what's wrong with it?" className={`${fieldCls} resize-none text-[14px]`} />
        </label>
        <div>
          <span className="mb-2 block text-[13px] font-semibold text-[#111110]/70">Photos & unboxing video</span>
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <span key={m.url} className="relative size-16 overflow-hidden rounded-[12px] bg-[#EFE8DA]">
                {m.kind === 'video' ? <span className="flex h-full w-full items-center justify-center"><Video size={20} /></span> : <img src={m.url} alt={m.name} className="h-full w-full object-cover" />}
                <button type="button" onClick={() => setMedia((list) => list.filter((x) => x.url !== m.url))} aria-label={`Remove ${m.name}`} className="absolute top-1 right-1 flex size-5 cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110]/80 text-white"><X size={12} /></button>
              </span>
            ))}
            {uploading > 0 && <span className="flex size-16 items-center justify-center rounded-[12px] bg-[#EFE8DA]"><Loader2 size={20} className="animate-spin" aria-label="Uploading" /></span>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={photos >= 5} onClick={() => photoRef.current?.click()} className={`${ghostBtnCls} px-4 py-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-40`}><Camera size={16} /> Add photos ({photos}/5)</button>
            <button type="button" disabled={videos >= 1} onClick={() => videoRef.current?.click()} className={`${ghostBtnCls} px-4 py-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-40`}><Video size={16} /> Add video ({videos}/1)</button>
          </div>
          <p className="m-0 mt-2 text-[12px] text-[#111110]/50">JPG, PNG or WEBP photos up to 5 MB · MP4 or MOV video up to 30 MB.</p>
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { add(e.target.files, 'image'); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={(e) => { add(e.target.files, 'video'); e.target.value = ''; }} />
        </div>
        {err && <p role="alert" className="m-0 rounded-[12px] bg-[#FFE0EA] px-3.5 py-2.5 text-[13px] text-[#B4123E]">{err}</p>}
        <button type="button" onClick={submit} disabled={busy || uploading > 0} className={`${primaryBtnCls} self-start`}><BtnSweep />{busy ? 'Sending…' : 'Send request'}</button>
      </div>
    </section>
  );
}

// Delivered orders: show the latest request's status, or the report button
// (inside the 24-hour window), or a note that the window has closed.
export function ProblemSection({ order, request, onCreate }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (order.status !== 'DELIVERED') return null;
  if (request) {
    return (
      <>
        {sent && <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-[#E8F7EE] px-4 py-3 font-['Inter',sans-serif] text-[14px] font-semibold text-[#1E8A4C]"><Check size={16} /> Request sent — we'll email you with updates.</p>}
        <RequestStatus request={request} />
      </>
    );
  }
  const deadline = reportDeadline(order);
  // eslint-disable-next-line react-hooks/purity -- deadline check at render is intended
  const openWindow = deadline && Date.now() < deadline.getTime();
  if (!openWindow) {
    return (
      <p className="m-0 flex items-start gap-2 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
        <Clock size={15} className="mt-0.5 shrink-0" /> Problems with an order must be reported within 24 hours of delivery. Need help? Contact customer care.
      </p>
    );
  }
  if (open) return <ReportForm order={order} onCancel={() => setOpen(false)} onSubmit={async (body) => { await onCreate(body); setSent(true); setOpen(false); }} />;
  return (
    <section className={`p-5 ${cardCls}`}>
      <h3 className="m-0 mb-1 flex items-center gap-2 text-[17px] font-bold"><AlertTriangle size={17} className="text-[#E8A200]" /> Something wrong?</h3>
      <p className="m-0 mb-3 font-['Inter',sans-serif] text-[14px] text-[#111110]/70">Damaged, defective, wrong or missing item? Report it with photos or your unboxing video before <b>{fmtTime(deadline)}</b>.</p>
      <button type="button" onClick={() => setOpen(true)} className={`${ghostBtnCls} px-5 py-2.5 text-[15px]`}>Report a problem</button>
    </section>
  );
}
