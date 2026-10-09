// Shared Tailwind class strings for the admin pages (colours are the
// --admin-* / --tone-* tokens in index.css, so they follow dark / light).
// Components live in AdminUI.jsx; these are plain strings so they can be
// mixed into any element.
export const DISPLAY = "font-['Bricolage_Grotesque','Inter',sans-serif]";

export const cardCls = 'rounded-[18px] border border-[var(--admin-border-2)] bg-[var(--admin-surface)]';

export const inputCls = 'h-11 w-full rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-bg)] px-3.5 text-[15px] text-[var(--admin-text)] outline-none transition-colors placeholder:text-[var(--admin-text-dim)] hover:border-[var(--admin-border-5)] focus:border-[var(--admin-accent)] disabled:opacity-60';
export const textareaCls = 'w-full rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-bg)] px-3.5 py-3 text-[15px] leading-relaxed text-[var(--admin-text)] outline-none transition-colors placeholder:text-[var(--admin-text-dim)] hover:border-[var(--admin-border-5)] focus:border-[var(--admin-accent)]';
export const selectCls = `${inputCls} cursor-pointer appearance-none pr-10`;

// Tables: wrap in <div className={tableWrapCls}><table className={tableCls}>…
export const tableWrapCls = `${cardCls} overflow-hidden`;
export const tableCls = 'w-full border-collapse text-[14px]';
export const thCls = 'px-[clamp(12px,1.4vw,20px)] py-3.5 text-left text-[12px] font-semibold tracking-[0.08em] whitespace-nowrap text-[var(--admin-text-muted)] uppercase';
export const tdCls = 'px-[clamp(12px,1.4vw,20px)] py-3.5 align-middle';
export const trCls = 'border-t border-[var(--admin-border-1)] transition-colors hover:bg-[var(--admin-hover-2)]';

// Order status → tone (shared by orders, customers, dashboard).
export const ORDER_STATUS = {
  PENDING: { label: 'Pending', tone: 'yellow' },
  CONFIRMED: { label: 'Confirmed', tone: 'blue' },
  SHIPPED: { label: 'Shipped', tone: 'purple' },
  DELIVERED: { label: 'Delivered', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};
