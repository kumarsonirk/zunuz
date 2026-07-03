import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const SECTIONS = [
  {
    heading: "We're Here to Help",
    body: [
      "At ZUNUZ, every order is carefully quality checked before it's packed and shipped. We genuinely want you to love your purchase, and if something isn't right, we're here to help.",
      'To keep the experience fair for everyone, please read the policy below.',
    ],
  },
  {
    heading: 'Returns',
    body: [
      'For hygiene reasons and because jewelry is a personal-use product, we do not accept returns once an order has been delivered.',
      'This helps us ensure that every customer receives a brand-new, unused product.',
      'We encourage you to carefully review the product details, images, and measurements before placing your order. If you have any questions before purchasing, our support team will be happy to assist you.',
    ],
  },
  {
    heading: 'When Can I Request a Replacement?',
    body: ["We're happy to assist if you receive:"],
    list: ['A damaged product', 'A defective product', 'An incorrect product'],
    footer: [<>If your order arrives in any of the above conditions, please contact us within <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>24 hours of delivery</strong>.</>],
  },
  {
    heading: 'How to Request a Replacement',
    body: ['To help us verify your request, please share:'],
    list: [
      'Your Order ID',
      'Clear photos of the product',
      <>An <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>uninterrupted unboxing video</strong> recorded from the moment the sealed shipping package is opened until the product is fully visible.</>,
    ],
    footer: [
      'The unboxing video is required because it helps us fairly verify genuine shipping or packing issues.',
      'Videos that begin after the package has already been opened, or edited or incomplete videos, may not be accepted for verification.',
    ],
  },
  {
    heading: 'Product Condition',
    body: ['To be eligible for a replacement, the product should:'],
    list: [
      'Be unused.',
      'Be in the same condition in which it was received.',
      'Not show signs of misuse, accidental damage, alteration, or improper handling.',
      'Be available for verification if requested by our support team.',
    ],
  },
  {
    heading: 'Verification Process',
    body: [
      "Once we receive your request, our team will carefully review the information provided.",
      "If your request meets our policy requirements, we'll arrange the most suitable resolution as quickly as possible.",
      'Depending on product availability, this may include:',
    ],
    list: [
      'A replacement of the same product.',
      'A replacement with a similar product of equal value (with your approval if the original is unavailable).',
      'A refund if a suitable replacement cannot be provided.',
    ],
    footer: ['Our goal is always to resolve genuine issues fairly and quickly.'],
  },
  {
    heading: 'Refunds',
    body: [
      'Approved refunds will be processed to the original payment method used while placing the order.',
      <>Once processed by us, refunds generally reflect within <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>5–7 business days</strong>, depending on your bank or payment provider.</>,
      'If you paid through Cash on Delivery (COD), our support team will guide you through the refund process using the details you provide.',
    ],
  },
  {
    heading: 'What Is Not Covered?',
    body: ['To keep our policy fair for all customers, replacements or refunds are generally not available for:'],
    list: [
      'Normal wear and tear after use.',
      'Damage caused by water, perfumes, lotions, sanitizers, sweat, or chemicals.',
      'Damage caused by accidental drops, bending, pulling, or improper handling.',
      <>Requests made after <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>24 hours</strong> of delivery.</>,
      'Missing verification details, including the required uninterrupted unboxing video.',
      'Minor variations in colour or finish caused by photography, lighting, or different screen settings.',
      'Change of mind after delivery.',
      'Orders where the product has been used, modified, repaired, or intentionally damaged.',
    ],
  },
  {
    heading: 'Our Commitment',
    body: [
      "We believe great customer service doesn't end after you place an order.",
      "If something genuinely goes wrong, we'll always do our best to resolve it fairly, transparently, and as quickly as possible.",
      "Your trust means everything to us, and we're committed to making every ZUNUZ shopping experience a great one.",
    ],
  },
];

export default function ReturnsReplacementsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <button onClick={() => navigate('/customer-care')} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Returns, Replacements & Refunds</h2>
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
