import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Store, CreditCard, Truck, Headphones, Package, UserCog, Save, RotateCcw, AlertTriangle, Eye, EyeOff, Check, Bell, Star, Megaphone, Gift, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { PageHeader, Card, Button, Field, Toggle, Badge } from '../../components/admin/AdminUI';
import { DISPLAY, inputCls, textareaCls } from '../../components/admin/adminStyles';
import { api } from '../../utils/api';

// Settings (/admin/settings): store-wide switches the website and server
// use (maintenance, payment methods, delivery charge, support contact,
// low-stock level) + the signed-in admin's own name and password.
// Store settings save together from the sticky bar; changes reach shoppers
// on their next page load.
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function Section({ icon: Icon, title, hint, tone = 'var(--admin-accent)', children, i = 0 }) {
  return (
    <Card className="p-[clamp(20px,2.2vw,30px)] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${i * 60}ms` }}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ color: tone, background: `color-mix(in srgb, ${tone} 14%, transparent)` }}><Icon size={19} /></span>
        <div>
          <h2 className={`m-0 text-[19px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{title}</h2>
          {hint && <p className="m-0 mt-0.5 text-[14px] text-[var(--admin-text-muted)]">{hint}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

function SwitchRow({ title, text, checked, onChange, warn }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-[14px] border px-4 py-3.5 transition-colors ${checked && warn ? 'border-[var(--tone-yellow)]/50 bg-[var(--tone-yellow)]/8' : 'border-[var(--admin-border-2)] bg-[var(--admin-bg)]'}`}>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-[var(--admin-text)]">{title}</span>
        {text && <span className="block text-[13px] text-[var(--admin-text-muted)]">{text}</span>}
      </span>
      <Toggle checked={!!checked} onChange={onChange} />
    </div>
  );
}

function MyAccount({ me }) {
  const [name, setName] = useState(me?.name || '');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setMsg(null);
    const body = {};
    if (name.trim() && name.trim() !== me?.name) body.name = name.trim();
    if (pw.next || pw.current) {
      if (pw.next.length < 8) { setMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
      if (pw.next !== pw.confirm) { setMsg({ ok: false, text: "New passwords don't match." }); return; }
      body.currentPassword = pw.current; body.newPassword = pw.next;
    }
    if (!Object.keys(body).length) { setMsg({ ok: false, text: 'Nothing to change.' }); return; }
    setBusy(true);
    try {
      const updated = await api.put('/admin/auth/me', body, true);
      try { localStorage.setItem('zunuz_admin_user', JSON.stringify(updated)); } catch { /* ignore */ }
      setPw({ current: '', next: '', confirm: '' });
      setMsg({ ok: true, text: body.newPassword ? 'Saved — use your new password next time you sign in.' : 'Saved.' });
    } catch (e) { setMsg({ ok: false, text: e.message || 'Could not save.' }); }
    finally { setBusy(false); }
  };

  const pwInput = (k, label, auto) => (
    <Field label={label}>
      <input className={inputCls} type={show ? 'text' : 'password'} value={pw[k]} autoComplete={auto} onChange={(e) => setPw((s) => ({ ...s, [k]: e.target.value }))} />
    </Field>
  );

  return (
    <Section icon={UserCog} title="My account" hint={`${me?.email || ''}${me?.role?.name ? ` · ${me.role.name}` : ''}`} tone="var(--tone-purple)" i={5}>
      <Field label="Display name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-[var(--admin-text)]">Change password</span>
        <button type="button" onClick={() => setShow((v) => !v)} className="flex cursor-pointer items-center gap-1.5 border-0 bg-transparent text-[13px] font-semibold text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">{show ? <EyeOff size={15} /> : <Eye size={15} />}{show ? 'Hide' : 'Show'}</button>
      </div>
      {pwInput('current', 'Current password', 'current-password')}
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        {pwInput('next', 'New password', 'new-password')}
        {pwInput('confirm', 'Confirm new password', 'new-password')}
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`m-0 flex items-center gap-2 rounded-[12px] px-4 py-3 text-[14px] font-medium ${msg.ok ? 'bg-[var(--tone-green)]/10 text-[var(--tone-green)]' : 'bg-[var(--tone-red)]/10 text-[var(--tone-red)]'}`}>{msg.ok && <Check size={16} />}{msg.text}</p>}
      <div><Button variant="secondary" icon={Save} loading={busy} onClick={save}>Save my account</Button></div>
    </Section>
  );
}

// Admin preview of the bar's referral message (AnnouncementBar fills it the same way).
function referralPreview(f) {
  const bonus = Number(f.referralFriendBonus) || 0;
  const reward = Number(f.referralReward) || 0;
  const t = String(f.referralBarText || '').trim() || 'Give {bonus}, get {reward} — refer a friend';
  return t.replace(/\{bonus\}/gi, `₹${bonus}`).replace(/\{reward\}/gi, `₹${reward}`);
}

export default function SettingsPage() {
  const { me } = useOutletContext() || {};
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showSecAnswer, setShowSecAnswer] = useState(false);

  const load = useCallback(() => api.get('/admin/settings', true)
    .then((d) => { setSaved(d.settings); setForm(d.settings); setError(''); })
    .catch((e) => setError(e.message || 'Could not load settings.')), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const dirtyKeys = useMemo(() => (form && saved ? Object.keys(form).filter((k) => JSON.stringify(form[k]) !== JSON.stringify(saved[k])) : []), [form, saved]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? (v.target.type === 'number' ? v.target.value : v.target.value) : v }));

  const save = async () => {
    setBusy(true); setError('');
    try {
      const patch = Object.fromEntries(dirtyKeys.map((k) => [k, form[k]]));
      const res = await api.put('/admin/settings', patch, true);
      setSaved(res.settings); setForm(res.settings);
      setNotice('Settings saved — shoppers see the changes on their next page load.');
    } catch (e) { setError(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  // Super Admin: remove the security answer (admins then sign in without it).
  const removeSecurityAnswer = async () => {
    if (!window.confirm('Switch the admin security question off? Admins will sign in with email + password only.')) return;
    setBusy(true); setError('');
    try {
      const res = await api.put('/admin/settings', { clearSecurityAnswer: true }, true);
      setSaved(res.settings); setForm(res.settings);
      setNotice('Security question switched off.');
    } catch (e) { setError(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1180px] pb-24">
      <PageHeader title="Settings" subtitle="Store-wide options for the website and checkout." />
      {error && <p role="alert" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
      {notice && <p role="status" className="m-0 mb-4 flex items-center gap-2 rounded-[12px] bg-[var(--tone-green)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-green)] animate-[jw-rise_0.3s_ease-out_both]"><Check size={16} /> {notice}</p>}

      {!form ? (
        <div className="grid grid-cols-2 gap-5 max-[1000px]:grid-cols-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[240px] animate-pulse rounded-[18px] bg-[var(--admin-hover-3)]" />)}</div>
      ) : (
        <div className="grid grid-cols-2 items-start gap-5 max-[1000px]:grid-cols-1">
          <Section icon={Store} title="Store status" hint="Take the website offline while you work on it." tone="var(--tone-yellow)" i={0}>
            <SwitchRow title="Maintenance mode" text="Shoppers see a “be right back” page. The admin panel keeps working." checked={form.maintenanceMode} onChange={set('maintenanceMode')} warn />
            {form.maintenanceMode && (
              <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-[var(--tone-yellow)]"><AlertTriangle size={16} className="mt-px shrink-0" /> When saved, the whole storefront goes offline for visitors.</p>
            )}
            <Field label="Maintenance message" hint="Shown on the maintenance page.">
              <textarea className={textareaCls} rows={3} maxLength={300} value={form.maintenanceMessage} onChange={set('maintenanceMessage')} />
            </Field>
            <SwitchRow title="Pause checkout" text="The store stays open — shoppers can browse and add to bag — but nobody can place an order. Use it while you're adding products." checked={form.checkoutPaused} onChange={set('checkoutPaused')} warn />
            {form.checkoutPaused && (
              <p className="m-0 flex items-start gap-2 text-[13px] font-medium text-[var(--tone-yellow)]"><AlertTriangle size={16} className="mt-px shrink-0" /> When saved, no new orders can be placed until you switch this off.</p>
            )}
            <Field label="Checkout paused message" hint="Shown in the bag and at checkout while checkout is paused.">
              <textarea className={textareaCls} rows={2} maxLength={200} value={form.checkoutPausedMessage} onChange={set('checkoutPausedMessage')} />
            </Field>
          </Section>

          <Section icon={CreditCard} title="Payments" hint="Which payment methods checkout offers." tone="var(--tone-green)" i={1}>
            <SwitchRow title="Online payments (Razorpay)" text="UPI, cards, netbanking and wallets." checked={form.onlinePaymentsEnabled} onChange={set('onlinePaymentsEnabled')} />
            <SwitchRow title="Cash on delivery" text="Customers pay when the order arrives." checked={form.codEnabled} onChange={set('codEnabled')} />
            {!form.onlinePaymentsEnabled && !form.codEnabled && <p className="m-0 text-[13px] font-semibold text-[var(--tone-red)]">Keep at least one payment method switched on.</p>}
          </Section>

          <Section icon={Truck} title="Delivery charge" hint="Charged at checkout below the free-delivery amount." tone="var(--tone-blue)" i={2}>
            <SwitchRow title="Charge for delivery" text={form.deliveryFeeEnabled ? `${inr(form.deliveryFee)} on orders under ${inr(form.freeDeliveryThreshold)}` : 'Delivery is free on every order.'} checked={form.deliveryFeeEnabled} onChange={set('deliveryFeeEnabled')} />
            <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <Field label="Delivery fee (₹)"><input className={inputCls} type="number" min={0} inputMode="numeric" disabled={!form.deliveryFeeEnabled} value={form.deliveryFee} onChange={set('deliveryFee')} /></Field>
              <Field label="Free delivery from (₹)" hint="Items total at or above this ships free."><input className={inputCls} type="number" min={0} inputMode="numeric" disabled={!form.deliveryFeeEnabled} value={form.freeDeliveryThreshold} onChange={set('freeDeliveryThreshold')} /></Field>
            </div>
            <SwitchRow title="Only deliver to listed pincodes" text={form.pincodeRestriction ? 'Checkout and the product page only accept pincodes on your Delivery Pincodes list.' : 'Every valid Indian pincode is accepted; listed ones get the faster delivery time below.'} checked={form.pincodeRestriction} onChange={set('pincodeRestriction')} />
            <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <Field label="Delivery time — listed pincodes" hint='Your Delivery Pincodes list (e.g. Bengaluru). Shown as "within 48 hours".'><input className={inputCls} value={form.listedPincodeEta ?? ''} onChange={set('listedPincodeEta')} maxLength={30} placeholder="48 hours" /></Field>
              <Field label="Delivery time — other pincodes" hint={form.pincodeRestriction ? 'Used once "Only deliver to listed pincodes" is off.' : 'Every other pincode in India.'}><input className={inputCls} value={form.otherPincodeEta ?? ''} onChange={set('otherPincodeEta')} maxLength={30} placeholder="5–7 working days" /></Field>
            </div>
            <Link to="/admin/pincodes" className="self-start text-[14px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">Manage delivery pincodes →</Link>
          </Section>

          <Section icon={Headphones} title="Support contact" hint="Shown on Customer Care, policy pages and the maintenance page." tone="var(--tone-pink)" i={3}>
            <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <Field label="Support email"><input className={inputCls} type="email" value={form.supportEmail} onChange={set('supportEmail')} /></Field>
              <Field label="Phone"><input className={inputCls} value={form.supportPhone} onChange={set('supportPhone')} /></Field>
              <Field label="WhatsApp number" hint="Digits with country code, e.g. 918310057566"><input className={inputCls} inputMode="numeric" value={form.supportWhatsapp} onChange={(e) => set('supportWhatsapp')(e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Support hours"><input className={inputCls} value={form.supportHours} onChange={set('supportHours')} /></Field>
            </div>
          </Section>

          <Section icon={Package} title="Orders & inventory" hint="Customer cancellations and low-stock warnings." tone="var(--tone-yellow)" i={4}>
            <Field label="Customers can cancel for (hours)" hint="From My orders, until the order ships. 0 = only you can cancel. Keep it in line with the Cancellation Policy page (6 hours).">
              <input className={`${inputCls} max-w-[200px]`} type="number" min={0} max={72} inputMode="numeric" value={form.cancelWindowHours} onChange={set('cancelWindowHours')} />
            </Field>
            <Field label="Low stock at" hint="Products with this many or fewer left are flagged as low stock.">
              <input className={`${inputCls} max-w-[200px]`} type="number" min={0} inputMode="numeric" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
            </Field>
          </Section>

          <Section icon={Megaphone} title="Announcement bar" hint="A thin strip at the top of every storefront page." tone="var(--tone-pink)" i={5}>
            <SwitchRow title="Show announcement bar" text={form.announcementText || 'No text yet'} checked={form.announcementEnabled} onChange={set('announcementEnabled')} />
            <Field label="Text" hint="Keep it short — up to 140 characters."><input className={inputCls} maxLength={140} value={form.announcementText} onChange={set('announcementText')} /></Field>
            <Field label="Link (optional)" hint="Where a tap goes, e.g. /shop?tier=199-plus or a full https:// link."><input className={inputCls} value={form.announcementLink} onChange={set('announcementLink')} placeholder="/shop" /></Field>
            <SwitchRow
              title="Show referral message"
              text={form.referralEnabled ? `Shows: ${referralPreview(form)}` : 'Refer & Earn is off, so this message is hidden.'}
              checked={form.referralBarEnabled !== false}
              onChange={set('referralBarEnabled')}
            />
            <Field label="Referral message" hint="Takes turns with the text above and opens Refer & Earn. Use {bonus} for the friend bonus and {reward} for the referrer reward — they fill in automatically.">
              <input className={inputCls} maxLength={140} value={form.referralBarText ?? ''} onChange={set('referralBarText')} placeholder="Give {bonus}, get {reward} — refer a friend" />
            </Field>
          </Section>

          <Section icon={Bell} title="Alerts" hint="Emails to you when something needs attention." tone="var(--tone-blue)" i={6}>
            <Field label="Send alerts to" hint="One or more emails, separated by commas. Empty = no alert emails."><input className={inputCls} value={form.alertEmail} onChange={set('alertEmail')} placeholder="you@example.com" /></Field>
            <SwitchRow title="New-order alerts" text="An email for every new order (cash on delivery placed or online payment received)." checked={form.newOrderAlerts} onChange={set('newOrderAlerts')} />
            <SwitchRow title="Daily low-stock email" text={`Every morning, a list of products with ${form.lowStockThreshold} or fewer left.`} checked={form.lowStockAlerts} onChange={set('lowStockAlerts')} />
          </Section>

          <Section icon={Star} title="Reviews" hint="Control what appears on product pages." tone="var(--tone-yellow)" i={7}>
            <SwitchRow title="Approve reviews before they appear" text="New reviews wait in Reviews → Pending until you approve them." checked={form.reviewModeration} onChange={set('reviewModeration')} />
          </Section>

          <div id="referrals" className="scroll-mt-6">
            <Section icon={Gift} title="Refer & Earn and Credits" hint="Customer referral bonuses, qualifying orders, and credit validity." tone="var(--tone-green)" i={8}>
              <SwitchRow
                title="Enable referral program"
                text="Allows customers to invite friends via code/link and earn credits."
                checked={form.referralEnabled}
                onChange={set('referralEnabled')}
              />
              <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                <Field label="Referrer reward (₹)" hint="Credited to the referrer when the friend verifies their email (same time as the friend's bonus).">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={5000}
                    inputMode="numeric"
                    value={form.referralReward ?? 50}
                    onChange={set('referralReward')}
                  />
                </Field>
                <Field label="Friend welcome bonus (₹)" hint="Credited to invited friend upon email verification.">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={5000}
                    inputMode="numeric"
                    value={form.referralFriendBonus ?? 50}
                    onChange={set('referralFriendBonus')}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                <Field label="Minimum qualifying order (₹)" hint="Only used when a referrer is over their monthly limit — then the reward waits for the friend's first order of at least this amount.">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100000}
                    inputMode="numeric"
                    value={form.referralMinOrder ?? 299}
                    onChange={set('referralMinOrder')}
                  />
                </Field>
                <Field label="Credit validity / expiry (days)" hint="How long credits stay valid before expiring (e.g. 180).">
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={3650}
                    inputMode="numeric"
                    value={form.creditExpiryDays ?? 180}
                    onChange={set('creditExpiryDays')}
                  />
                </Field>
              </div>
              <Field label="Monthly referral cap" hint="Maximum rewarded referrals per customer per calendar month (0 = unlimited).">
                <input
                  className={`${inputCls} max-w-[200px]`}
                  type="number"
                  min={0}
                  max={1000}
                  inputMode="numeric"
                  value={form.referralMonthlyCap ?? 10}
                  onChange={set('referralMonthlyCap')}
                />
              </Field>
              <Link to="/admin/referrals" className="self-start text-[14px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">
                View all referrals and credit logs →
              </Link>
            </Section>
          </div>

          <div id="navratri-offer" className="scroll-mt-6">
            <Section icon={Sparkles} title="Navratri & Festive Offers" hint="Configure 'Pick Any 3 @ ₹999' combo bundle and eligibility." tone="var(--tone-yellow)" i={9}>
              <SwitchRow
                title="Enable Navratri offer"
                text="Activates the 'Pick Any 3 @ ₹999' bundle promotion on /navratri-offers and applies bundle pricing in the bag."
                checked={form.navratriOfferEnabled}
                onChange={set('navratriOfferEnabled')}
              />
              <Field label="Offer title" hint="Displayed on the offer landing page and cart discount summary.">
                <input
                  className={inputCls}
                  maxLength={100}
                  value={form.navratriOfferTitle ?? 'Pick Any 3 @ ₹999'}
                  onChange={set('navratriOfferTitle')}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                <Field label="Bundle item count" hint="How many items customers must pick to get the offer (e.g. 3).">
                  <input
                    className={inputCls}
                    type="number"
                    min={2}
                    max={20}
                    inputMode="numeric"
                    value={form.navratriBundleCount ?? 3}
                    onChange={set('navratriBundleCount')}
                  />
                </Field>
                <Field label="Bundle special price (₹)" hint="Fixed combo price for the chosen items (e.g. 999).">
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={100000}
                    inputMode="numeric"
                    value={form.navratriBundlePrice ?? 999}
                    onChange={set('navratriBundlePrice')}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
                <Field label="Minimum item price (₹)" hint="Only products priced at or above this amount qualify (e.g. 499).">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100000}
                    inputMode="numeric"
                    value={form.navratriMinPrice ?? 499}
                    onChange={set('navratriMinPrice')}
                  />
                </Field>
                <Field label="Maximum item price (₹)" hint="Only products priced at or below this amount qualify (e.g. 699).">
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100000}
                    inputMode="numeric"
                    value={form.navratriMaxPrice ?? 699}
                    onChange={set('navratriMaxPrice')}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link to="/navratri-offers" target="_blank" className="text-[14px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">
                  Preview /navratri-offers storefront page →
                </Link>
                <span className="text-[var(--admin-text-muted)]">·</span>
                <Link to="/admin/content" className="text-[14px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">
                  Customize Hero Carousel Banner in Content →
                </Link>
              </div>
            </Section>
          </div>

          <div id="login-security" className="scroll-mt-6">
            <Section icon={ShieldCheck} title="Admin login security" hint="Secret question & answer required for admin sign-in." tone="var(--tone-green)" i={10}>
              <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">
                When an answer is set, every admin sign-in needs email, password <b>and</b> the answer to this question.
              </p>
              <p className={`m-0 flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold ${saved?.adminSecurityAnswerSet ? 'bg-[var(--tone-green)]/10 text-[var(--tone-green)]' : 'bg-[var(--tone-yellow)]/12 text-[var(--tone-yellow)]'}`}>
                <ShieldCheck size={15} className="shrink-0" />
                {saved?.adminSecurityAnswerSet ? 'On — an answer is set. Admins must answer the question to sign in.' : 'Off — no answer set yet. Admins sign in with email + password only.'}
              </p>
              <Field label="Security question" hint="Displayed on the admin sign-in page.">
                <input
                  className={inputCls}
                  maxLength={150}
                  value={form.adminSecurityQuestion ?? ''}
                  onChange={set('adminSecurityQuestion')}
                  placeholder="e.g. What is your store security code?"
                />
              </Field>
              <Field label={saved?.adminSecurityAnswerSet ? 'New security answer' : 'Security answer'} hint="4–150 characters, not case-sensitive. It's stored encrypted and can't be viewed — leave this empty to keep the current answer.">
                <div className="relative">
                  <input
                    className={`${inputCls} pr-10`}
                    type={showSecAnswer ? 'text' : 'password'}
                    maxLength={150}
                    value={form.adminSecurityAnswer ?? ''}
                    onChange={set('adminSecurityAnswer')}
                    placeholder={saved?.adminSecurityAnswerSet ? 'Type a new answer to replace it' : 'Choose an answer'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecAnswer((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center border-0 bg-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                    aria-label={showSecAnswer ? 'Hide answer' : 'Show answer'}
                  >
                    {showSecAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <p className="m-0 flex items-start gap-2 rounded-[10px] bg-[var(--admin-hover-3)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--admin-text-muted)]">
                <Lock size={14} className="mt-0.5 shrink-0 text-[var(--tone-green)]" />
                <span>Only a Super Admin can change or remove this. Forgot the answer? On the server run <code>node scripts/reset-admin-security-question.js</code> to switch the question off, then set a new one here.</span>
              </p>
              {saved?.adminSecurityAnswerSet && (
                <button type="button" onClick={removeSecurityAnswer} className="self-start cursor-pointer rounded-[10px] border border-[var(--tone-red)]/35 bg-transparent px-3.5 py-2 text-[13px] font-semibold text-[var(--tone-red)] transition-colors hover:bg-[var(--tone-red)]/10">
                  Switch the security question off
                </button>
              )}
            </Section>
          </div>

          <MyAccount key={me?.id || 'me'} me={me} />
        </div>
      )}

      {/* Sticky save bar */}
      {form && dirtyKeys.length > 0 && (
        <div className="fixed right-0 bottom-0 left-[290px] z-30 flex justify-center px-4 pb-4 max-[768px]:left-0 animate-[jw-rise_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="flex w-full max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[var(--admin-border-4)] bg-[var(--admin-surface)] px-5 py-3.5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)]">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-[var(--admin-text)]"><Badge tone="yellow" dot>{dirtyKeys.length} unsaved</Badge> change{dirtyKeys.length === 1 ? '' : 's'}</span>
            <span className="flex gap-2">
              <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setForm(saved)} disabled={busy}>Discard</Button>
              <Button size="sm" icon={Save} loading={busy} onClick={save}>Save changes</Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
