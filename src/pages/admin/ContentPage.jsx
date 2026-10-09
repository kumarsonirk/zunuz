import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Megaphone, Info, ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../../utils/api';
import { PageHeader, Card, Badge, EmptyState, Button, SkeletonRows } from '../../components/admin/AdminUI';
import { DISPLAY } from '../../components/admin/adminStyles';
import BlockEditor from '../../components/admin/content/BlockEditor';
import { AnnouncementPreview } from '../../components/admin/content/ContentPreview';

// Homepage & Banners (/admin/content): edit the home page hero and the
// scrolling strip (the only editable blocks — server/src/routes/content.js
// EDITABLE_KEYS; schema + validation live there too), each with a live
// preview, Save and Reset to default. The announcement bar is configured on
// the Settings page; this page shows its current state and links there.

// Link styled like the secondary admin Button.
const linkBtn = 'inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-surface)] font-semibold whitespace-nowrap text-[var(--admin-text)] no-underline transition-colors duration-200 hover:border-[var(--admin-border-5)] hover:bg-[var(--admin-hover-3)]';

function AnnouncementCard({ settings, error }) {
  const on = !!settings?.announcementEnabled;
  return (
    <Card className="mb-6 p-[clamp(16px,2vw,24px)] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="min-w-0">
          <h2 className={`m-0 flex flex-wrap items-center gap-2 text-[18px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>
            <Megaphone size={19} strokeWidth={1.8} className="text-[var(--admin-accent)]" /> Announcement bar
            {settings && (on ? <Badge tone="green" dot>Showing</Badge> : <Badge tone="muted" dot>Off</Badge>)}
          </h2>
          <p className="m-0 mt-1 max-w-[560px] text-[14px] text-[var(--admin-text-muted)]">
            The slim pink strip at the very top of every storefront page. Shoppers can dismiss it for their visit.
          </p>
          {error ? (
            <p className="m-0 mt-3 text-[13px] font-semibold text-[var(--tone-red)]">{error}</p>
          ) : settings && (
            <dl className="m-0 mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[14px]">
              <dt className="text-[var(--admin-text-muted)]">Text</dt><dd className="m-0 truncate font-medium text-[var(--admin-text)]">{settings.announcementText || '—'}</dd>
              <dt className="text-[var(--admin-text-muted)]">Link</dt><dd className="m-0 truncate font-medium text-[var(--admin-text)]">{settings.announcementLink || 'No link'}</dd>
            </dl>
          )}
          <Link to="/admin/settings" className={`${linkBtn} mt-4 h-9 px-3.5 text-[13px]`}>
            <SettingsIcon size={15} /> Edit in Settings
          </Link>
        </div>
        <div className="min-w-0">
          <p className="m-0 mb-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">Preview{settings && !on ? ' (currently hidden)' : ''}</p>
          <div className={settings && !on ? 'opacity-55 grayscale-[0.4]' : ''}>
            <AnnouncementPreview text={settings?.announcementText} link={settings?.announcementLink} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ContentPage() {
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get('/admin/content', true)
      .then((d) => { if (alive) { setBlocks(d.blocks || []); setError(''); } })
      .catch((e) => { if (alive) setError(e.message || 'Could not load content'); });
    // Public settings endpoint — works for admins without the Settings permission.
    api.get('/settings')
      .then((s) => { if (alive) setSettings(s); })
      .catch(() => { if (alive) setSettingsError("Couldn't load the announcement settings."); });
    return () => { alive = false; };
  }, [reloadKey]);

  const onSaved = (updated) => setBlocks((list) => list.map((b) => (b.key === updated.key ? updated : b)));

  const customizedCount = blocks ? blocks.filter((b) => b.customized.length).length : 0;

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        title="Homepage & Banners"
        subtitle={blocks ? `The home page hero and scrolling strip · ${customizedCount} of ${blocks.length} customised` : 'The home page hero and scrolling strip.'}
        actions={(
          <a href="/" target="_blank" rel="noreferrer" className={`${linkBtn} h-11 px-5 text-[15px]`}>
            <ExternalLink size={17} /> View home page
          </a>
        )}
      />

      <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-[var(--tone-blue)]/30 bg-[var(--tone-blue)]/8 px-4 py-3 text-[14px] text-[var(--admin-text)]">
        <Info size={18} className="mt-0.5 shrink-0 text-[var(--tone-blue)]" />
        <span>Each block saves on its own. Shoppers see your changes on their <b>next page load</b> (pages already open keep the old text until refreshed). “Reset to default” brings back the built-in copy.</span>
      </div>

      <AnnouncementCard settings={settings} error={settingsError} />

      {error ? (
        <Card><EmptyState icon={LayoutTemplate} title="Couldn't load content" text={error} action={<Button variant="secondary" onClick={() => { setError(''); setReloadKey((k) => k + 1); }}>Try again</Button>} /></Card>
      ) : !blocks ? (
        <Card><SkeletonRows rows={6} /></Card>
      ) : (
        blocks.length === 0 ? (
          <Card><EmptyState icon={LayoutTemplate} title="Nothing to edit here" text="There are no editable blocks right now." /></Card>
        ) : (
          <div className="flex flex-col gap-5">
            {blocks.map((b, i) => <BlockEditor key={b.key} block={b} onSaved={onSaved} style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }} />)}
          </div>
        )
      )}
    </div>
  );
}
