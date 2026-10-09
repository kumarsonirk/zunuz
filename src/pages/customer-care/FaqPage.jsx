import { useId, useState } from 'react';
import PolicyLayout from '../../components/store/PolicyLayout';
import Seo from '../../components/Seo';
import { FAQS } from '../../data/faqs';

// FAQs (/customer-care/faq): the shared FAQ list as an accordion (one open
// at a time, first open), inside the policy page frame.
const ACCENTS = ['bg-[#FF3D8B] text-white', 'bg-[#F6C915] text-[#111110]', 'bg-[#1A6FE8] text-white', 'bg-[#7A4BD6] text-white'];

export default function FaqPage() {
  const [open, setOpen] = useState(0);
  const base = `faq-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <PolicyLayout eyebrow="Customer care" title="Questions? Answered." intro="Quick answers about orders, delivery, payments and caring for your pieces.">
      <Seo
        title="Frequently Asked Questions"
        description="Answers to common questions about ZUNUZ orders, shipping, returns, and payments."
        path="/customer-care/faq"
      />
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q} className={`pl-sec overflow-hidden rounded-[22px] border-2 bg-white/85 transition-[border-color,box-shadow] duration-300 ${isOpen ? 'border-[#111110] shadow-[0_18px_40px_-28px_rgba(17,17,16,0.5)]' : 'border-transparent'}`}>
              <h2 className="m-0">
                <button
                  type="button"
                  id={`${base}-q${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`${base}-a${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent p-[clamp(16px,2vw,22px)] text-left text-[length:clamp(16px,1.6vw,19px)] font-bold text-[#111110]"
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full font-['Inter',sans-serif] text-[13px] ${ACCENTS[i % ACCENTS.length]}`}>{i + 1}</span>
                  <span className="flex-1">{f.q}</span>
                  <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,rotate] duration-300 ${isOpen ? 'rotate-180 bg-[#111110] text-white' : 'bg-[#111110]/6'}`} aria-hidden="true">
                    <span className="absolute h-[2px] w-3 rounded-full bg-current" />
                    <span className={`absolute h-3 w-[2px] rounded-full bg-current transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                  </span>
                </button>
              </h2>
              <div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="m-0 px-[clamp(16px,2vw,22px)] pb-5 pl-[calc(clamp(16px,2vw,22px)+48px)] font-['Inter',sans-serif] text-[15px] leading-relaxed text-[#111110]/72">{f.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PolicyLayout>
  );
}
