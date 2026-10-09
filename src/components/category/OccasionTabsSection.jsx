import React from 'react';

export default function OccasionTabsSection({
  title = 'Made for every moment.',
  subtitle = 'From everyday looks to nights out, find a piece for every occasion.',
  tabs = [],
  activeTab = 0,
  setActiveTab,
  sectionRef,
  tabsHeadingRef,
  tabsRowRef,
  inkColor = '#1F2024',
  paperColor = '#F5F2EB',
  fadeClass = 'nw-fade-el',
  rowClass = 'nw-tabs-row',
}) {
  const currentTab = tabs[activeTab] || tabs[0] || {};

  return (
    <section ref={sectionRef} style={{ background: inkColor, padding: 'clamp(40px, 7vw, 70px) clamp(20px, 6vw, 80px) clamp(50px, 8vw, 80px)', boxSizing: 'border-box' }}>
      <h2 className={fadeClass} style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 28px', fontWeight: 700, fontSize: 'clamp(24px, 3.6vw, 34px)', maxWidth: '560px', color: paperColor }}>
        {title}{' '}
        {subtitle && (
          <span style={{ fontWeight: 400, color: 'rgba(245,242,235,0.55)' }}>
            {subtitle}
          </span>
        )}
      </h2>
      <div ref={tabsHeadingRef} className={fadeClass} style={{ position: 'relative', width: '100%', maxWidth: '640px', height: 'clamp(480px, 42vw, 480px)', overflow: 'hidden', borderRadius: '16px' }}>
        <img src={currentTab.image} alt={currentTab.label || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div ref={tabsRowRef} className={rowClass} style={{
        position: 'relative', display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto',
        marginTop: '20px', marginLeft: '0px', marginRight: '-20px', marginBottom: '22px', zIndex: 2,
        paddingRight: '20px', paddingBottom: '4px', WebkitOverflowScrolling: 'touch',
      }}>
        {tabs.map((tab, i) => (
          <button
            key={tab.label || i}
            type="button"
            data-cursor-hover
            onClick={() => setActiveTab && setActiveTab(i)}
            style={{
              flexShrink: 0, whiteSpace: 'nowrap', padding: '10px 18px', borderRadius: '999px',
              border: `1px solid ${activeTab === i ? paperColor : 'rgba(245,242,235,0.3)'}`,
              background: activeTab === i ? paperColor : 'rgba(31,32,36,0.65)',
              color: activeTab === i ? inkColor : paperColor, backdropFilter: 'blur(6px)',
              fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className={fadeClass} style={{ fontFamily: "'Inter', sans-serif", margin: 0, maxWidth: '480px', fontSize: '14px', lineHeight: 1.6, color: 'rgba(245,242,235,0.6)' }}>
        {currentTab.desc}
      </p>
    </section>
  );
}
