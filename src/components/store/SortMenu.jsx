import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';

// Themed sort dropdown (replaces a native <select>, whose popup can't be
// styled and spills off the right edge on phones). Desktop: a pill showing
// the current sort; ≤ 700px: a round icon button with a pink dot when a
// non-default sort is on. The menu opens right-aligned under the button so
// it always stays on screen. Keyboard: ↑/↓ move, Enter picks, Esc closes.
//   options: [{ key, label }] — the first one is the default.
export default function SortMenu({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const itemRefs = useRef([]);
  const id = useId();
  const current = options.find((o) => o.key === value) || options[0];
  const isDefault = current.key === options[0].key;

  useEffect(() => {
    if (!open) return undefined;
    // Focus the selected option when the menu opens.
    const idx = Math.max(0, options.findIndex((o) => o.key === value));
    itemRefs.current[idx]?.focus();
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, options, value]);

  const pick = (key) => { onChange(key); setOpen(false); btnRef.current?.focus(); };
  const onItemKey = (e, i) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = options.length;
      itemRefs.current[(i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative shrink-0 font-['Inter',sans-serif]">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        aria-label={`Sort: ${current.label}`}
        title="Sort"
        className={`relative flex cursor-pointer items-center gap-2 rounded-full border-2 bg-white py-2 pr-3 pl-4 text-[14px] font-semibold text-[#111110] transition-colors duration-300 hover:border-[#111110] max-[700px]:size-10 max-[700px]:justify-center max-[700px]:p-0 ${open ? 'border-[#111110]' : 'border-[#111110]/15'}`}
      >
        <span className="text-[#111110]/50 max-[700px]:hidden">Sort:</span>
        <span className="max-[700px]:hidden">{current.label}</span>
        <ChevronDown size={16} className={`transition-transform duration-300 max-[700px]:hidden ${open ? 'rotate-180' : ''}`} />
        <ArrowUpDown size={17} aria-hidden="true" className="min-[701px]:hidden" />
        {!isDefault && <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#FF3D8B] min-[701px]:hidden" />}
      </button>

      <ul
        id={`${id}-menu`}
        role="listbox"
        aria-label="Sort products"
        className={`absolute top-[calc(100%+8px)] right-0 z-30 m-0 w-[min(240px,calc(100vw-32px))] origin-top-right list-none rounded-[18px] border border-[#111110]/8 bg-[#FFFDF8]/95 p-1.5 shadow-[0_24px_48px_-20px_rgba(17,17,16,0.45)] backdrop-blur-xl transition-[opacity,scale,translate] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0'}`}
        inert={!open}
      >
        <li aria-hidden="true" className="px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-[0.08em] text-[#111110]/45 uppercase">Sort by</li>
        {options.map((o, i) => {
          const on = o.key === current.key;
          return (
            <li key={o.key} role="presentation">
              <button
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => pick(o.key)}
                onKeyDown={(e) => onItemKey(e, i)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[12px] border-0 px-3 py-2.5 text-left text-[14px] outline-none transition-colors duration-150 focus-visible:bg-[#111110]/6 ${on ? 'bg-[#FFE0EA] font-bold text-[#111110]' : 'bg-transparent font-medium text-[#111110]/80 hover:bg-[#111110]/5 hover:text-[#111110]'}`}
              >
                {o.label}
                {on && <Check size={16} strokeWidth={2.5} className="shrink-0 text-[#FF3D8B]" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
