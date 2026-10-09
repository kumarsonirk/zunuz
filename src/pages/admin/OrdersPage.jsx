import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Download, Star, Eye, Check, Clock, Truck, CheckCircle2, IndianRupee,
  MapPin, CreditCard, User, Package,
  Copy, StickyNote, RotateCcw, XCircle,
} from 'lucide-react';
import { api } from '../../utils/api';
import { downloadInvoice, canInvoice } from '../../utils/invoice';
import {
  PageHeader, StatRow, Button, IconButton, Badge, Select, Tabs, EmptyState, SkeletonRows, Modal, ConfirmDialog,
} from '../../components/admin/AdminUI';
import {
  ShippingPanel, RefundPanel, NotePanel, RefundBadge, MismatchWarning, PriceBreakdown,
} from '../../components/admin/fulfilment/FulfilmentPanels';
import { RETURN_STATUS, RETURN_TYPE, paymentMethodName } from '../../components/admin/fulfilment/fulfilmentUtils';
import { DISPLAY, tableWrapCls, tableCls, thCls, tdCls, trCls, ORDER_STATUS } from '../../components/admin/adminStyles';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
// A real order: COD, or paid (online / ZUNUZ Credits). Unpaid online checkouts can only be
// cancelled; a refunded cancelled order can't be brought back (server-enforced).
const isRealOrder = (o) => o.paymentMethod === 'COD' || o.paymentStatus === 'PAID';
const statusOptions = (order) => {
  if (order.status === 'CANCELLED' && (order.refundAmount || 0) > 0) return ['CANCELLED'];
  if (!isRealOrder(order)) return [...new Set([order.status, 'CANCELLED'])];
  return order.status === 'PENDING'
    ? ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    : ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
};

function StarRating({ value, size = 16 }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          className={n <= value ? 'fill-[var(--tone-yellow)] text-[var(--tone-yellow)]' : 'fill-transparent text-[var(--admin-border-4)]'}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || ORDER_STATUS.PENDING;
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

// Payment method + payment-status pill (COD + PENDING reads "Pay on delivery").
function PaymentInfo({ order }) {
  const isCod = order.paymentMethod === 'COD';
  const tone = order.paymentStatus === 'PAID' ? 'green' : order.paymentStatus === 'FAILED' ? 'red' : 'yellow';
  const label = isCod && order.paymentStatus === 'PENDING' ? 'Pay on delivery' : (order.paymentStatus || 'PENDING');
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="text-[12px] font-medium text-[var(--admin-text-muted)]">{paymentMethodName(order.paymentMethod)}{order.paymentMethod !== 'CREDITS' && (order.creditsUsed || 0) > 0 ? ' + credits' : ''}</span>
      <Badge tone={tone} className="capitalize">{label.toLowerCase()}</Badge>
    </span>
  );
}

const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Label + value cell in the payment grid; IDs get a copy button.
function InfoItem({ label, children, copy }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard?.writeText(copy).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => { /* clipboard blocked */ });
  };
  return (
    <div className="min-w-0">
      <p className="m-0 text-[14px] font-semibold text-[var(--admin-text)]">{label}</p>
      <div className="mt-1.5 flex items-center gap-2 text-[15px] text-[var(--admin-text)]">
        <span className="min-w-0 break-all">{children}</span>
        {copy && (
          <button type="button" onClick={doCopy} aria-label={`Copy ${label}`} title={copied ? 'Copied!' : 'Copy'} className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[var(--admin-hover-3)] text-[var(--admin-text-muted)] transition-colors hover:text-[var(--admin-text)]">
            {copied ? <Check size={14} className="text-[var(--tone-green)]" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// "Payment information" panel inside an order (Razorpay IDs, status, amount).
function PaymentDetails({ order }) {
  const online = order.paymentMethod === 'RAZORPAY';
  const byCredits = order.paymentMethod === 'CREDITS';
  const creditsUsed = order.creditsUsed || 0;
  const status = order.paymentStatus || 'PENDING';
  const tone = status === 'PAID' ? 'green' : status === 'FAILED' ? 'red' : 'yellow';
  const label = !online && status === 'PENDING' ? 'pay on delivery' : status.toLowerCase();
  return (
    <section className="overflow-hidden rounded-[16px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)]">
      <h3 className={`m-0 flex items-center gap-2 border-b border-[var(--admin-border-2)] px-5 py-4 text-[17px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>
        <CreditCard size={18} strokeWidth={1.8} className="text-[var(--admin-accent)]" /> Payment Information
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-5 max-[520px]:grid-cols-1">
        <InfoItem label="Amount"><span className="font-semibold tabular-nums">{inr(order.total)}</span></InfoItem>
        <InfoItem label="Placed At">{fmtDateTime(order.createdAt)}</InfoItem>
        <InfoItem label="Method">{byCredits ? 'Paid with ZUNUZ Credits' : online ? 'Online — Razorpay' : 'Cash on delivery'}</InfoItem>
        <InfoItem label="Status"><Badge tone={tone} className="capitalize">{label}</Badge></InfoItem>
        {creditsUsed > 0 && <InfoItem label="ZUNUZ Credits Used"><span className="font-semibold tabular-nums">{inr(creditsUsed)}</span></InfoItem>}
        {byCredits ? null : online ? (
          <>
            <InfoItem label="Razorpay Order ID" copy={order.razorpayOrderId}>{order.razorpayOrderId || <span className="text-[var(--admin-text-muted)]">—</span>}</InfoItem>
            <InfoItem label="Payment ID" copy={order.razorpayPaymentId}>{order.razorpayPaymentId || <span className="text-[var(--admin-text-muted)]">{status === 'FAILED' ? 'Payment not completed' : 'Not paid yet'}</span>}</InfoItem>
            {order.updatedAt && <InfoItem label={status === 'PAID' ? 'Last Updated' : 'Updated At'}>{fmtDateTime(order.updatedAt)}</InfoItem>}
          </>
        ) : (
          <InfoItem label="To Collect">{status === 'PAID' ? <span className="text-[var(--tone-green)]">Collected</span> : <span className="font-semibold tabular-nums">{inr(order.total)} on delivery</span>}</InfoItem>
        )}
      </div>
    </section>
  );
}

function DetailSection({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] p-4">
      <h3 className="m-0 mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">
        <Icon size={14} strokeWidth={1.8} /> {title}
      </h3>
      {children}
    </section>
  );
}

export default function OrdersPage() {
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0); // bump to reload after a status change
  const [res, setRes] = useState({ key: null, filter: null, orders: [], total: 0, pages: 1 });
  const [counts, setCounts] = useState({});
  const [revenue, setRevenue] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [shipCheck, setShipCheck] = useState(null); // order about to ship without tracking
  const [params, setParams] = useSearchParams();
  const openParam = Number(params.get('open')) || null;

  // ?open=<id> (e.g. from the Returns page) opens that order's modal.
  useEffect(() => {
    if (!openParam) return undefined;
    let alive = true;
    api.get(`/admin/orders/${openParam}`, true)
      .then((o) => { if (alive) setDetailOrder(o); })
      .catch((e) => { if (alive) setError(e.message || `Could not open order #${openParam}.`); });
    return () => { alive = false; };
  }, [openParam]);

  const closeDetail = () => {
    setDetailOrder(null);
    if (openParam) setParams({}, { replace: true });
  };

  // An order changed (tracking / note / refund / status) — update modal + row.
  const applyOrder = useCallback((o) => {
    if (!o) return;
    setDetailOrder((prev) => (prev && prev.id === o.id ? o : prev));
    setRes((r) => ({ ...r, orders: r.orders.map((x) => (x.id === o.id ? o : x)) }));
  }, []);
  const reloadOrder = useCallback((id) => {
    api.get(`/admin/orders/${id}`, true).then(applyOrder).catch(() => { /* keep what we have */ });
  }, [applyOrder]);

  const filterKey = `${activeStatus}:${page}`;
  const queryKey = `${filterKey}:${tick}`;
  const showSkeleton = res.filter !== filterKey;
  const refreshing = res.key !== queryKey;
  const { orders, total, pages } = res;

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ page });
    if (activeStatus !== 'ALL') params.set('status', activeStatus);
    api.get(`/admin/orders?${params}`, true)
      .then((data) => {
        if (alive) setRes({ key: queryKey, filter: filterKey, orders: data.orders || [], total: data.total || 0, pages: data.pages || 1 });
      })
      .catch((e) => {
        console.error(e);
        if (alive) setRes((r) => ({ ...r, key: queryKey, filter: filterKey }));
      });
    return () => { alive = false; };
  }, [activeStatus, page, filterKey, queryKey]);

  // Tab counts (one request, same filter as the list) + revenue from the stats endpoint.
  useEffect(() => {
    let alive = true;
    api.get('/admin/orders/counts', true)
      .then((c) => { if (alive) setCounts(c); })
      .catch(() => { /* tabs just show no counts */ });
    api.get('/admin/stats?period=all', true)
      .then((d) => { if (alive) setRevenue(d.revenue ?? null); })
      .catch(() => { /* stat tile just shows a dash */ });
    return () => { alive = false; };
  }, [tick]);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setError('');
    try {
      const updated = await api.put(`/admin/orders/${orderId}/status`, { status }, true);
      applyOrder(updated);
      setTick((t) => t + 1);
    } catch (e) { setError(e.message || 'Could not update the order status.'); }
    finally { setUpdatingId(null); }
  };

  // Shipping without a tracking number is allowed, but asks first.
  const changeStatus = (order, status) => {
    if (status === 'SHIPPED' && order.status !== 'SHIPPED' && !order.trackingNumber) { setShipCheck(order); return; }
    updateStatus(order.id, status);
  };

  const n = (k) => counts[k] ?? null;
  const toProcess = n('PENDING') != null && n('CONFIRMED') != null ? n('PENDING') + n('CONFIRMED') : null;
  const stats = [
    { label: 'To process', icon: Clock, value: toProcess ?? '—', tone: toProcess ? 'pink' : 'muted', sub: `${n('PENDING') ?? '—'} pending · ${n('CONFIRMED') ?? '—'} confirmed` },
    { label: 'Shipped', icon: Truck, value: n('SHIPPED') ?? '—', tone: 'purple', sub: 'On the way' },
    { label: 'Delivered', icon: CheckCircle2, value: n('DELIVERED') ?? '—', tone: 'green', sub: 'Completed orders' },
    { label: 'Revenue', icon: IndianRupee, value: revenue == null ? '—' : inr(revenue), tone: 'green', sub: 'Excluding cancelled' },
  ];
  const tabs = STATUSES.map((s) => ({ key: s, label: s === 'ALL' ? 'All' : ORDER_STATUS[s].label, count: counts[s] ?? undefined }));

  const d = detailOrder;
  const canApprove = (o) => o.status === 'PENDING' && isRealOrder(o);

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader title="Orders" subtitle={`${total} order${total === 1 ? '' : 's'}${activeStatus === 'ALL' ? ' total' : ` · ${ORDER_STATUS[activeStatus].label.toLowerCase()}`}`}>
        <StatRow items={stats} />
      </PageHeader>

      <Tabs items={tabs} value={activeStatus} onChange={(s) => { setActiveStatus(s); setPage(1); }} className="mb-5" />

      {error && (
        <p role="alert" className="m-0 mb-4 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{error}</p>
      )}

      <div className={`${tableWrapCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: '150ms' }}>
        {showSkeleton ? (
          <SkeletonRows rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No orders found" text={activeStatus === 'ALL' ? 'Orders will appear here once customers check out.' : `There are no ${ORDER_STATUS[activeStatus].label.toLowerCase()} orders right now.`} />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-300 ${refreshing ? 'opacity-60' : 'opacity-100'}`}>
            <table className={tableCls}>
              <thead>
                <tr>
                  {['ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className={`${trCls} cursor-pointer`} onClick={() => setDetailOrder(order)}>
                    <td className={`${tdCls} font-semibold text-[var(--admin-text)]`}>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        #{order.id}
                        {order.adminNote && <span title={`Internal note: ${order.adminNote.slice(0, 140)}`} aria-label="Has an internal note" className="inline-flex text-[var(--tone-yellow)]"><StickyNote size={13} strokeWidth={2} /></span>}
                        {order.returnRequests?.some((r) => ['PENDING', 'APPROVED'].includes(r.status)) && <span title="Open return / replacement request" aria-label="Open return request" className="inline-flex text-[var(--tone-pink)]"><RotateCcw size={13} strokeWidth={2} /></span>}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[200px] truncate font-medium text-[var(--admin-text)]">{order.customer?.name}</span>
                      <span className="block max-w-[200px] truncate text-[12px] text-[var(--admin-text-muted)]">{order.customer?.phone || order.customer?.email}</span>
                    </td>
                    <td className={`${tdCls} text-[var(--admin-text-muted)] tabular-nums`}>{order.items?.length}</td>
                    <td className={`${tdCls} font-semibold whitespace-nowrap text-[var(--admin-text)] tabular-nums`}>{inr(order.total)}</td>
                    <td className={tdCls}>
                      <span className="flex flex-col items-start gap-1">
                        <PaymentInfo order={order} />
                        <RefundBadge order={order} size="sm" />
                        <MismatchWarning order={order} compact />
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="flex flex-col items-start gap-1.5">
                        <StatusBadge status={order.status} />
                        {order.trackingNumber && (
                          <span className="block max-w-[170px] truncate text-[11px] text-[var(--admin-text-muted)]" title={`${order.courier || 'Courier'} · ${order.trackingNumber}`}>
                            <Truck size={11} className="mr-1 inline align-[-1px]" />{order.courier ? `${order.courier} · ` : ''}{order.trackingNumber}
                          </span>
                        )}
                        {order.review && <StarRating value={order.review.rating} size={12} />}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-[13px] text-[var(--admin-text-muted)]`}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <IconButton label={canInvoice(order) ? 'Download invoice' : 'Invoice available once delivered'} icon={Download} disabled={!canInvoice(order)} onClick={() => downloadInvoice(order)} />
                        <IconButton label="View details" icon={Eye} tone="accent" onClick={() => setDetailOrder(order)} />
                        {canApprove(order) && (
                          <Button
                            size="sm"
                            icon={Check}
                            loading={updatingId === order.id}
                            onClick={() => updateStatus(order.id, 'CONFIRMED')}
                            title="Approve order and send confirmation email to customer"
                            className="bg-[var(--tone-green)]! shadow-none!"
                          >
                            Approve
                          </Button>
                        )}
                        <Select
                          aria-label={`Update status of order #${order.id}`}
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) => changeStatus(order, e.target.value)}
                          className="w-[150px] shrink-0 [&_select]:h-9 [&_select]:rounded-[10px] [&_select]:text-[13px]"
                        >
                          {statusOptions(order).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              aria-current={page === p ? 'page' : undefined}
              onClick={() => setPage(p)}
              className={`size-9 cursor-pointer rounded-[10px] border-0 text-[13px] font-semibold tabular-nums transition-colors ${page === p ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-hover-3)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'}`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}

      <Modal
        open={!!d}
        onClose={closeDetail}
        width={680}
        title={d ? `Order #${d.id}` : ''}
        subtitle={d && (
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} />
            {new Date(d.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        footer={d && (
          <>
            <Button variant="secondary" icon={Download} disabled={!canInvoice(d)} title={canInvoice(d) ? undefined : 'Invoice available once the order is delivered'} onClick={() => downloadInvoice(d)}>Download Invoice</Button>
            {canApprove(d) && (
              <Button icon={Check} loading={updatingId === d.id} onClick={() => updateStatus(d.id, 'CONFIRMED')} className="bg-[var(--tone-green)]! shadow-none!">
                Approve Order &amp; Send Email
              </Button>
            )}
          </>
        )}
      >
        {d && (
          <div className="flex flex-col gap-4">
            <MismatchWarning order={d} />
            {d.returnRequests?.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-[var(--admin-border-2)] bg-[var(--admin-hover-2)] px-4 py-3 text-[14px] text-[var(--admin-text)]">
                <RotateCcw size={16} className="text-[var(--tone-pink)]" aria-hidden="true" />
                {d.returnRequests.map((r) => (
                  <Link key={r.id} to={`/admin/returns?open=${r.id}`} className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-text)] no-underline hover:underline">
                    {RETURN_TYPE[r.type] || r.type} request #{r.id}
                    <Badge tone={RETURN_STATUS[r.status]?.tone}>{RETURN_STATUS[r.status]?.label || r.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
            <DetailSection icon={Package} title={`Items (${d.items?.length || 0})`}>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {d.items?.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <span className="size-12 shrink-0 overflow-hidden rounded-[10px] border border-[var(--admin-border-2)] bg-white">
                      {item.product?.image && <img src={item.product.image} alt="" className="h-full w-full object-contain" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">{item.product?.name}</span>
                      <span className="text-[13px] text-[var(--admin-text-muted)]">Qty {item.quantity} × {inr(item.price)}</span>
                    </span>
                    <span className="text-[14px] font-semibold text-[var(--admin-text)] tabular-nums">{inr(item.quantity * item.price)}</span>
                  </li>
                ))}
              </ul>
              <PriceBreakdown order={d} />
            </DetailSection>

            <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
              <DetailSection icon={MapPin} title="Delivery address">
                {d.address?.name && (
                  <p className="m-0 mb-1 text-[14px] font-semibold text-[var(--admin-text)]">
                    {d.address.name}{d.address.phone && ` · +91 ${d.address.phone}`}
                  </p>
                )}
                <p className="m-0 text-[14px] leading-relaxed text-[var(--admin-text)]">
                  {d.address?.houseNo ? `${d.address.houseNo}, ` : ''}{d.address?.street}, {d.address?.city}<br />
                  {d.address?.landmark ? `Near ${d.address.landmark}, ` : ''}{d.address?.state} - {d.address?.pincode}
                </p>
              </DetailSection>

              <DetailSection icon={User} title="Customer">
                <p className="m-0 text-[14px] font-semibold text-[var(--admin-text)]">{d.customer?.name}</p>
                {d.customer?.email && <p className="m-0 text-[13px] break-all text-[var(--admin-text-muted)]">{d.customer.email}</p>}
                {d.customer?.phone && <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">{d.customer.phone}</p>}
              </DetailSection>
            </div>

            {d.status === 'CANCELLED' && d.cancelledAt && (
              <DetailSection icon={XCircle} title={d.cancelledBy === 'CUSTOMER' ? 'Cancelled by the customer' : 'Cancelled by admin'}>
                <p className="m-0 text-[14px] text-[var(--admin-text)]">
                  {new Date(d.cancelledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {d.cancelReason && <> · <span className="font-semibold">{d.cancelReason}</span></>}
                </p>
                <p className="m-0 mt-1 text-[13px] text-[var(--admin-text-muted)]">
                  Stock and any coupon use were given back.
                  {d.cancelledBy === 'CUSTOMER' && d.paymentMethod === 'RAZORPAY' && d.paymentStatus === 'PAID' && (d.refundError ? ' The automatic refund failed — retry it from the Refund panel below.' : ' The payment was refunded automatically.')}
                </p>
              </DetailSection>
            )}

            <PaymentDetails order={d} />

            <ShippingPanel key={`ship-${d.id}`} order={d} onSaved={applyOrder} />

            <RefundPanel key={`refund-${d.id}`} order={d} onDone={(o) => (o ? applyOrder(o) : reloadOrder(d.id))} />

            <NotePanel key={`note-${d.id}`} order={d} onSaved={applyOrder} />

            {d.review && (
              <DetailSection icon={Star} title="Customer review">
                <StarRating value={d.review.rating} />
                {d.review.comment && <p className="m-0 mt-2.5 text-[14px] leading-relaxed text-[var(--admin-text)]">{d.review.comment}</p>}
              </DetailSection>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">Update status</span>
              <Select value={d.status} disabled={updatingId === d.id} onChange={(e) => changeStatus(d, e.target.value)}>
                {statusOptions(d).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
              </Select>
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!shipCheck}
        title="Ship without tracking?"
        message={shipCheck ? `Order #${shipCheck.id} has no tracking number yet, so the customer's "on its way" email won't include a tracking link. You can add tracking later from the order's Shipping section.` : ''}
        confirmLabel="Mark as shipped"
        danger={false}
        busy={!!shipCheck && updatingId === shipCheck.id}
        onClose={() => setShipCheck(null)}
        onConfirm={async () => { await updateStatus(shipCheck.id, 'SHIPPED'); setShipCheck(null); }}
      />
    </div>
  );
}
