import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const SECTIONS = [
  {
    heading: 'Changed Your Mind? No Problem.',
    body: [
      'We understand that plans can change, and we want to make the cancellation process as simple as possible.',
    ],
  },
  {
    heading: 'Order Cancellation',
    list: [
      <>Orders can be cancelled within <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>6 hours</strong> of being placed.</>,
      'Once an order has been packed or shipped, it can no longer be cancelled.',
    ],
    footer: ['We begin processing orders quickly to ensure fast delivery, which is why cancellation is only possible within the above time frame.'],
  },
  {
    heading: 'How to Cancel',
    body: [
      'To request a cancellation, please contact our support team as soon as possible with your Order ID.',
      "We'll review your request and let you know if your order is still eligible for cancellation.",
    ],
  },
  {
    heading: 'Refund for Cancelled Orders',
    body: [
      'If your cancellation request is approved, your refund will be processed to the original payment method used while placing the order.',
      <>For prepaid orders, refunds are generally processed within <strong style={{ color: '#F5F2EB', fontWeight: 600 }}>5–7 business days</strong>, depending on your bank or payment provider.</>,
      'For Cash on Delivery (COD) orders, no refund is applicable if no payment has been made.',
    ],
  },
  {
    heading: 'Orders That Cannot Be Cancelled',
    body: ['Cancellation will not be available if:'],
    list: [
      'Your order has already been packed.',
      'Your order has already been shipped.',
      'The cancellation request is received after the 6-hour cancellation window.',
    ],
  },
  {
    heading: 'Need Help?',
    body: [
      'If you have any questions about your order, our support team is always happy to help.',
      "We'll do our best to assist you as quickly as possible and make your shopping experience smooth and worry-free.",
      'Thank you for choosing ZUNUZ.',
    ],
  },
];

export default function CancellationPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <button onClick={() => navigate('/customer-care')} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Cancellation Policy</h2>
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
