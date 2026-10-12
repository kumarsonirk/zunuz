import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, CheckCircle2, XCircle, UserCheck, Coins, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { PageHeader, StatRow, Button, Badge, SearchInput, Tabs, EmptyState, SkeletonRows, Modal, Field } from '../../components/admin/AdminUI';
import { tableWrapCls, tableCls, thCls, tdCls, trCls, inputCls } from '../../components/admin/adminStyles';
import { api } from '../../utils/api';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const STATUS_TONE = {
  JOINED: 'yellow',
  REWARDED: 'green',
  REJECTED: 'red',
};

const STATUS_LABEL = {
  JOINED: 'Pending / Joined',
  REWARDED: 'Rewarded',
  REJECTED: 'Rejected',
};

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState(null); // referral object to reject
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (status !== 'ALL') q.set('status', status);
      if (search.trim()) q.set('search', search.trim());
      q.set('page', page);
      const res = await api.get(`/admin/referrals?${q.toString()}`, true);
      setData(res);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load referrals.');
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (ref) => {
    if (busyId) return;
    setBusyId(ref.id);
    try {
      await api.put(`/admin/referrals/${ref.id}`, { action: 'approve' }, true);
      load();
    } catch (e) {
      alert(e.message || 'Could not approve referral.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejecting || !rejectReason.trim() || busyId) return;
    setBusyId(rejecting.id);
    try {
      await api.put(`/admin/referrals/${rejecting.id}`, { action: 'reject', reason: rejectReason.trim() }, true);
      setRejecting(null);
      setRejectReason('');
      load();
    } catch (e) {
      alert(e.message || 'Could not reject referral.');
    } finally {
      setBusyId(null);
    }
  };

  const items = data?.items || [];
  const s = data?.stats;

  const stats = [
    { label: 'Total referrals', value: s ? s.total.toLocaleString('en-IN') : '–', icon: Gift, sub: s ? `${s.joined} pending` : ' ', tone: 'muted' },
    { label: 'Rewarded referrals', value: s ? s.rewarded.toLocaleString('en-IN') : '–', icon: UserCheck, sub: 'Paid out', tone: 'green' },
    { label: 'Credits issued', value: s ? inr(s.creditsIssued) : '–', icon: Coins, sub: 'Referrals & friend bonuses', tone: 'pink' },
    { label: 'Credits spent', value: s ? inr(s.creditsSpent) : '–', icon: Coins, sub: 'Used on completed orders', tone: 'blue' },
    { label: 'Credits outstanding', value: s ? inr(s.creditsOutstanding) : '–', icon: Coins, sub: 'Unspent customer balance', tone: 'yellow' },
  ];

  const tabs = [
    { key: 'ALL', label: 'All', count: s?.total },
    { key: 'JOINED', label: 'Pending / Joined', count: s?.joined },
    { key: 'REWARDED', label: 'Rewarded', count: s?.rewarded },
    { key: 'REJECTED', label: 'Rejected', count: s?.rejected },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Referrals & Credits"
        subtitle="Manage customer referral rewards, friend welcome bonuses, and store credits."
        actions={
          <div className="flex items-center gap-2.5">
            <Link to="/admin/settings#referrals" className="no-underline">
              <Button variant="secondary" icon={SlidersHorizontal}>
                Program Settings
              </Button>
            </Link>
            <Button variant="secondary" icon={RefreshCw} onClick={load} loading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      <StatRow items={stats} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Tabs items={tabs} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <SearchInput
          placeholder="Search by name, email or code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-72"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-[14px] bg-[var(--tone-red)]/10 p-4 text-[14px] font-semibold text-[var(--tone-red)] border border-[var(--tone-red)]/20">
          {error}
        </div>
      )}

      <div className={`mt-5 ${tableWrapCls}`}>
        {loading ? (
          <SkeletonRows rows={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No referrals found"
            text={search ? `No referrals matched "${search}"` : 'Customer referrals will show up here as shoppers invite their friends.'}
          />
        ) : (
          // Scrolls sideways on narrow screens so the Approve / Reject buttons stay reachable.
          <div className="overflow-x-auto">
          <table className={`${tableCls} min-w-[880px]`}>
            <thead>
              <tr>
                <th className={thCls}>Referrer</th>
                <th className={thCls}>Referee (Friend)</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Reward / Bonus</th>
                <th className={thCls}>Joined Date</th>
                <th className={thCls}>Rewarded / Reason</th>
                <th className={`${thCls} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className={trCls}>
                  <td className={tdCls}>
                    {r.referrer ? (
                      <div>
                        <div className="font-semibold text-[var(--admin-text)]">{r.referrer.name || 'Unnamed'}</div>
                        <div className="text-[12px] text-[var(--admin-text-muted)]">{r.referrer.email}</div>
                      </div>
                    ) : (
                      <span className="text-[var(--admin-text-dim)]">Unknown</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    {r.referee ? (
                      <div>
                        <div className="font-semibold text-[var(--admin-text)]">{r.referee.name || 'Unnamed'}</div>
                        <div className="text-[12px] text-[var(--admin-text-muted)]">{r.referee.email}</div>
                      </div>
                    ) : (
                      <span className="text-[var(--admin-text-dim)]">Unknown</span>
                    )}
                  </td>
                  <td className={tdCls}>
                    <Badge tone={STATUS_TONE[r.status] || 'muted'} dot>
                      {STATUS_LABEL[r.status] || r.status}
                    </Badge>
                  </td>
                  <td className={tdCls}>
                    <div className="font-semibold tabular-nums text-[var(--admin-text)]">
                      {inr(r.reward || 50)} <span className="text-[12px] font-normal text-[var(--admin-text-muted)]">(Friend: {inr(r.friendBonus || 50)})</span>
                    </div>
                  </td>
                  <td className={tdCls}>
                    <span className="text-[13px] text-[var(--admin-text-muted)]">{fmtDate(r.createdAt)}</span>
                  </td>
                  <td className={tdCls}>
                    {r.status === 'REWARDED' ? (
                      <span className="text-[13px] text-[var(--tone-green)]">{fmtDate(r.rewardedAt)}</span>
                    ) : r.status === 'REJECTED' ? (
                      <span className="text-[13px] text-[var(--tone-red)]">{r.rejectReason || 'Not eligible'}</span>
                    ) : (
                      <span className="text-[13px] text-[var(--admin-text-dim)]">{r.friendBonus > 0 ? 'Pending — paid after friend’s first delivered order (or Approve now)' : 'Waiting for friend to verify email'}</span>
                    )}
                  </td>
                  <td className={`${tdCls} text-right`}>
                    {r.status === 'JOINED' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          icon={CheckCircle2}
                          loading={busyId === r.id}
                          onClick={() => handleApprove(r)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger-soft"
                          icon={XCircle}
                          disabled={busyId === r.id}
                          onClick={() => { setRejecting(r); setRejectReason(''); }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[14px] text-[var(--admin-text-muted)]">
            Showing page {data.page} of {data.pages} ({data.total} referrals)
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={data.page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejecting && (
        <Modal
          open={!!rejecting}
          onClose={() => setRejecting(null)}
          title="Reject Referral"
          subtitle={`Rejecting referral for ${rejecting.referrer?.name || 'referrer'} and ${rejecting.referee?.name || 'friend'}.`}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busyId === rejecting.id}
                disabled={!rejectReason.trim()}
                onClick={handleRejectSubmit}
              >
                Confirm Rejection
              </Button>
            </div>
          }
        >
          <Field label="Reason for Rejection" hint="Provide a short explanation (e.g. self-referral, duplicate account, order cancelled)." required>
            <input
              type="text"
              placeholder="e.g. Same delivery address as referrer"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </Field>
        </Modal>
      )}
    </div>
  );
}
