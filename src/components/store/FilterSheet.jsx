import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';

// Phone filter panel for category and store pages: a bottom sheet listing
// filter options (desktop bar shows them as chips instead). Portalled to <body>
// because the sticky filter bar has backdrop-filter, which would trap a
// position: fixed child inside it.
//   options: [{ key, label, count, to, onClick, on }]
//   sections: [{ heading, options }]
export default function FilterSheet({
  open,
  onClose,
  title = 'Filter',
  heading = 'Budget',
  options,
  sections,
  onReset,
  applyLabel,
  autoClose = true,
  showCounts = true,
}) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const normalizedSections = sections && sections.length > 0
    ? sections
    : (options ? [{ heading, options }] : []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`}
      inert={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-sheet-title"
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#111110]/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-lenis-prevent
        className={`absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-[28px] bg-[#FFF8EE] font-['Inter',sans-serif] text-[#111110] shadow-[0_-24px_60px_-30px_rgba(17,17,16,0.6)] outline-none transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <span aria-hidden="true" className="mx-auto mt-3 mb-2 block h-1.5 w-10 shrink-0 rounded-full bg-[#111110]/15" />
        
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-1 pb-3">
          <div className="flex items-center gap-2.5">
            <h2 id="filter-sheet-title" className="m-0 font-['Bricolage_Grotesque','Inter',sans-serif] text-[22px] font-bold">
              {title}
            </h2>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="cursor-pointer rounded-full border border-[#111110]/15 bg-white px-2.5 py-1 text-[11px] font-bold text-[#111110]/70 transition-colors hover:border-[#111110] hover:text-[#111110]"
              >
                Clear all
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110]/6 text-[#111110] transition-colors hover:bg-[#111110]/12"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {normalizedSections.map((sec, sIdx) => (
            <div key={sec.heading || sIdx} className={sIdx > 0 ? 'mt-5' : ''}>
              {sec.heading && (
                <p className="m-0 mb-2 text-[12px] font-bold tracking-[0.08em] text-[#111110]/50 uppercase">
                  {sec.heading}
                </p>
              )}
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {sec.options.map((o) => {
                  const content = (
                    <>
                      <span>{o.label}</span>
                      <span className="flex items-center gap-2">
                        {showCounts && (
                          <span className={`text-[13px] font-medium ${o.on ? 'text-white/65' : 'text-[#111110]/45'}`}>
                            {o.count} piece{o.count === 1 ? '' : 's'}
                          </span>
                        )}
                        {o.on && <Check size={17} strokeWidth={2.5} />}
                      </span>
                    </>
                  );
                  const cls = `flex w-full items-center justify-between rounded-[16px] border-2 px-4 py-3.5 text-[15px] font-semibold no-underline transition-colors duration-200 cursor-pointer ${
                    o.on
                      ? 'border-[#111110] bg-[#111110] text-white'
                      : 'border-[#111110]/10 bg-white text-[#111110] active:border-[#111110]'
                  }`;

                  return (
                    <li key={o.key}>
                      {o.onClick ? (
                        <button
                          type="button"
                          onClick={() => {
                            o.onClick();
                            if (autoClose) {
                              onClose();
                            }
                          }}
                          aria-current={o.on || undefined}
                          className={cls}
                        >
                          {content}
                        </button>
                      ) : (
                        <Link
                          to={o.to || '#'}
                          replace
                          preventScrollReset
                          onClick={onClose}
                          aria-current={o.on || undefined}
                          className={cls}
                        >
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Optional Apply button at bottom */}
        {applyLabel && (
          <div className="shrink-0 border-t border-[#111110]/10 bg-[#FFF8EE] px-5 py-3 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={onClose}
              className="w-full cursor-pointer rounded-2xl bg-[#111110] py-3.5 text-center font-['Inter',sans-serif] text-[15px] font-bold text-white shadow-md transition-transform hover:bg-black active:scale-[0.99]"
            >
              {applyLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

