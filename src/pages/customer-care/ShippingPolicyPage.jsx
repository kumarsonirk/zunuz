import React from 'react';

const SECTIONS = [
  {
    heading: 'Fast Shipping. Carefully Packed.',
    body: [
      "At ZUNUZ, we know waiting for your order can be exciting. That's why we work hard to dispatch every order as quickly as possible while making sure it's packed with care.",
      'Our goal is simple — to get your order to you safely, quickly, and in perfect condition.',
    ],
  },
  {
    heading: 'Order Processing',
    list: [
      <>Most orders are carefully packed and dispatched within <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>12 hours</strong> after your order is successfully confirmed.</>,
      'Orders placed on Sundays or public holidays may be processed on the next working day.',
      "During product launches, festive seasons, or high-demand periods, processing may take a little longer. If this happens, we'll do our best to keep you updated.",
    ],
  },
  {
    heading: 'Delivery Time',
    body: [<>Most ZUNUZ orders are delivered within <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>2–7 business days</strong>, depending on your delivery location.</>, 'While we always aim for the fastest possible delivery, timelines may occasionally vary due to:'],
    list: [
      'Weather conditions',
      'Public holidays',
      'Festivals',
      'Courier partner delays',
      'Government restrictions',
      'Other unforeseen circumstances beyond our reasonable control',
    ],
    footer: ["We'll always do our best to ensure your order reaches you as soon as possible."],
  },
  {
    heading: 'Order Tracking',
    body: [
      "As soon as your order is shipped, you'll receive tracking details through your registered email address, SMS, or WhatsApp (where applicable).",
      'You can use the tracking information to follow your order until it reaches your doorstep.',
    ],
  },
  {
    heading: 'Shipping Charges',
    body: [
      'Any applicable shipping charges will be clearly displayed during checkout before you complete your purchase.',
      'There are no hidden shipping charges.',
    ],
  },
  {
    heading: 'Delivery Address',
    body: [
      'Please make sure your shipping address, contact number, and other delivery details are accurate before placing your order.',
      'Incorrect or incomplete information may result in delivery delays, failed delivery attempts, or the package being returned to us.',
      'If an order is returned because of an incorrect address, customer unavailability, or refusal to accept delivery, additional shipping charges may apply if you request the package to be shipped again.',
    ],
  },
  {
    heading: 'Lost or Damaged Shipments',
    body: [
      "If your package is confirmed as lost during transit by our courier partner, we'll work with you to provide a suitable resolution after verification.",
      'If your package appears to be visibly damaged before opening, we recommend recording an uninterrupted unboxing video from the moment you receive the sealed package. This helps us verify and resolve any genuine shipping issues quickly.',
    ],
  },
  {
    heading: 'Our Promise',
    body: ['Every ZUNUZ order is:'],
    list: [
      'Carefully quality checked before dispatch.',
      'Packed with care to help ensure it reaches you safely.',
      'Shipped as quickly as possible.',
      "Supported by a team that's always happy to help if you need us.",
    ],
    footer: ['Thank you for choosing ZUNUZ. We truly appreciate your trust and look forward to being part of your everyday style.'],
  },
];

export default function ShippingPolicyPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Shipping & Delivery</h2>
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
