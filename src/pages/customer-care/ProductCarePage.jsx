import React from 'react';

const SECTIONS = [
  {
    heading: 'Wear It. Love It. Take Care of It.',
    body: [
      "Your ZUNUZ jewelry is made to complement your everyday style. With just a little care, you can help keep it looking beautiful for longer.",
      "Fashion jewelry naturally changes over time depending on how it's worn and cared for. Following these simple tips will help you enjoy your jewelry for as long as possible.",
    ],
  },
  {
    heading: 'Everyday Care',
    body: ['For the best experience, we recommend:'],
    list: [
      'Put your jewelry on after applying perfume, lotion, makeup, or hairspray.',
      'Remove your jewelry before bathing, swimming, exercising, or sleeping.',
      'Avoid direct contact with water, sweat, sanitizers, cleaning products, and other harsh chemicals.',
      'Handle your jewelry gently and avoid dropping, bending, or pulling it.',
    ],
    footer: ['A little care goes a long way.'],
  },
  {
    heading: 'Storage Tips',
    body: ["When you're not wearing your jewelry:"],
    list: [
      'Store it in the original ZUNUZ box or pouch whenever possible.',
      'Keep it in a cool, clean, and dry place.',
      'Avoid storing multiple jewelry pieces together, as they may scratch each other.',
    ],
    footer: ['Proper storage helps maintain the finish and shine of your jewelry.'],
  },
  {
    heading: 'Cleaning Your Jewelry',
    body: ['To keep your jewelry looking its best:'],
    list: [
      'Gently wipe it with a soft, dry cloth after use.',
      'Do not use harsh cleaning solutions, polishing chemicals, or abrasive materials.',
      'Never soak fashion jewelry in water or cleaning liquids.',
    ],
  },
  {
    heading: 'A Friendly Reminder',
    body: [
      'Fashion jewelry is designed for style and everyday wear. Over time, natural changes in colour, shine, or finish may occur depending on usage, climate, moisture, perfumes, sweat, storage, and general care.',
      'These natural changes are a normal part of fashion jewelry and are not considered manufacturing defects.',
      'Following this Product Care Guide will help your ZUNUZ jewelry stay looking its best for longer.',
    ],
  },
  {
    heading: 'Need Help?',
    body: [
      "If you have any questions about caring for your jewelry, we're always happy to help.",
      'Our support team is just a message away.',
      'Thank you for choosing ZUNUZ. We hope every piece becomes a part of your everyday style.',
    ],
  },
];

export default function ProductCarePage() {
  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Product Care Guide</h2>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {SECTIONS.map((section, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F2EB', fontFamily: "'Grift', sans-serif", letterSpacing: '0.04em' }}>
              {section.heading}
            </h3>
            {section.body?.map((p, j) => (
              <p key={j} style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>{p}</p>
            ))}
            {section.list && (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, paddingLeft: '18px' }}>
                {section.list.map((item, j) => (
                  <li key={j} style={{ fontSize: '15px', lineHeight: 1.6, color: '#A1A1AA' }}>{item}</li>
                ))}
              </ul>
            )}
            {section.footer?.map((p, j) => (
              <p key={j} style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>{p}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
