import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const SECTIONS = [
  {
    heading: 'Welcome to ZUNUZ',
    body: [
      "Thank you for visiting ZUNUZ.",
      "We're committed to making your shopping experience simple, transparent, and enjoyable. By accessing our website or placing an order, you agree to these Terms & Conditions along with our other website policies.",
      "Please read them carefully before making a purchase.",
    ],
  },
  {
    heading: 'Using Our Website',
    body: ["By using our website, you agree to:"],
    list: [
      'Provide accurate and complete information when placing an order.',
      'Use the website only for lawful purposes.',
      'Not misuse, interfere with, or attempt to gain unauthorized access to our website or services.',
      'Comply with all applicable laws while using our website.',
    ],
  },
  {
    heading: 'Products & Product Information',
    body: ['We make every effort to display our products as accurately as possible.', 'However:'],
    list: [
      "Product colours and finishes may appear slightly different due to photography, lighting, or your device's display settings.",
      'Minor variations in colour, texture, or finish are a normal part of fashion jewelry and do not affect product quality.',
      'Product descriptions, specifications, and prices may be updated without prior notice to improve accuracy.',
    ],
  },
  {
    heading: 'Pricing',
    body: [
      'All prices displayed on our website are in Indian Rupees (₹).',
      'While we take great care to ensure pricing accuracy, technical or human errors may occasionally occur.',
      'If an order is placed with an incorrect price due to an error, ZUNUZ reserves the right to cancel the order and issue a full refund if payment has already been received.',
    ],
  },
  {
    heading: 'Product Availability',
    body: [
      'All products are subject to availability.',
      "If an item becomes unavailable after your order has been placed, we'll inform you as soon as possible and provide a suitable resolution, including a replacement (where available) or a full refund.",
    ],
  },
  {
    heading: 'Order Acceptance',
    body: [
      'Placing an order on our website does not automatically guarantee acceptance.',
      'Orders are confirmed after successful verification and processing.',
      'In certain situations, we may cancel an order, including but not limited to:',
    ],
    list: [
      'Product unavailable',
      'Pricing or technical errors',
      'Suspected fraudulent activity',
      'Payment verification issues',
      'Misuse of offers or promotional codes',
    ],
    footer: ['If your order is cancelled after payment has been received, a full refund will be processed.'],
  },
  {
    heading: 'Promotional Offers',
    body: [
      'Promotional offers, discount codes, and special campaigns are subject to their individual terms.',
      'Unless specifically mentioned, offers cannot be combined.',
      'ZUNUZ reserves the right to modify, suspend, or discontinue promotions at any time without prior notice.',
    ],
  },
  {
    heading: 'Shipping & Delivery',
    body: [
      'Shipping timelines provided on our website are estimated.',
      'While we always aim to deliver your order as quickly as possible, delays may occasionally occur due to courier operations, weather conditions, public holidays, government restrictions, or other circumstances beyond our reasonable control.',
      'For complete details, please refer to our Shipping & Delivery page.',
    ],
  },
  {
    heading: 'Returns & Replacements',
    body: [
      'Our Returns & Replacements Guide explains when a replacement or refund may be available.',
      'For hygiene reasons, delivered jewelry cannot be returned simply because of a change of mind.',
      'Please refer to our dedicated Returns, Replacements & Refunds page for complete details.',
    ],
  },
  {
    heading: 'Product Care',
    body: [
      'Fashion jewelry naturally requires proper care.',
      'Following the recommendations in our Product Care Guide will help maintain the appearance and finish of your jewelry.',
      'Natural wear resulting from normal usage, exposure to moisture, perfumes, sweat, chemicals, or improper care is not considered a manufacturing defect.',
    ],
  },
  {
    heading: 'Intellectual Property',
    body: ['All content available on the ZUNUZ website, including but not limited to:'],
    list: [
      'Brand name',
      'Logo',
      'Product photographs',
      'Videos',
      'Graphics',
      'Website design',
      'Product descriptions',
      'Text and creative content',
    ],
    footer: [
      'is the property of ZUNUZ unless otherwise stated.',
      'No content may be copied, reproduced, distributed, modified, or used without prior written permission.',
    ],
  },
  {
    heading: 'Customer Conduct',
    body: [
      'We believe in treating everyone with respect and expect the same from our customers.',
      'Abusive behaviour, fraudulent activities, misuse of promotional offers, false claims, repeated policy abuse, or any activity intended to cause loss or disruption may result in cancellation of orders or refusal of future service.',
    ],
  },
  {
    heading: 'Limitation of Liability',
    body: [
      'To the fullest extent permitted by applicable law, ZUNUZ shall not be responsible for indirect, incidental, special, or consequential losses arising from the use of our website or products.',
      'Nothing in these Terms & Conditions limits any rights that customers may have under applicable consumer protection laws.',
    ],
  },
  {
    heading: 'Privacy',
    body: [
      'Your personal information is handled in accordance with our Privacy Policy.',
      'We encourage you to read it to understand how your information is collected, used, and protected.',
    ],
  },
  {
    heading: 'Changes to These Terms',
    body: [
      'We may update these Terms & Conditions from time to time to reflect changes in our services, business operations, or applicable legal requirements.',
      'The latest version will always be available on our website.',
    ],
  },
  {
    heading: 'Governing Law',
    body: [
      'These Terms & Conditions are governed by the laws of India.',
      'Any disputes arising from the use of this website or purchases made through ZUNUZ shall be subject to the jurisdiction of the competent courts where ZUNUZ is registered, unless applicable law provides otherwise.',
    ],
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Terms & Conditions</h2>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {SECTIONS.map((section, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F2EB', fontFamily: "'Qrokinex', sans-serif", letterSpacing: '0.10em' }}>
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

        <div style={{ marginTop: '8px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F2EB', fontFamily: "'Qrokinex', sans-serif", letterSpacing: '0.04em' }}>Thank You</h3>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>Thank you for choosing ZUNUZ.</p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>Every order means a lot to us, and we're committed to delivering not just great products, but also an honest, transparent, and enjoyable shopping experience.</p>
          <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>If you ever need assistance, our support team is always happy to help.</p>
        </div>
      </div>
    </div>
  );
}
