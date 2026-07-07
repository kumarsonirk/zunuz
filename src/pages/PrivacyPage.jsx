import React from 'react';

const SECTIONS = [
  {
    heading: 'Your Privacy Matters',
    body: [
      "At ZUNUZ, your privacy is important to us. We're committed to handling your personal information responsibly, securely, and transparently.",
      'This Privacy Policy explains what information we collect, how we use it, and the choices you have when you shop with us or use our website.',
      'By using our website or placing an order, you agree to the practices described in this Privacy Policy.',
    ],
  },
  {
    heading: 'Information We Collect',
    body: ['When you visit our website or place an order, we may collect information such as:'],
    subsections: [
      {
        subheading: 'Personal Information',
        list: ['Full name', 'Mobile number', 'Email address', 'Shipping address', 'Billing address (if applicable)'],
      },
      {
        subheading: 'Order Information',
        list: ['Products purchased', 'Order history', 'Payment status', 'Delivery information'],
      },
      {
        subheading: 'Technical Information',
        body: ['When you browse our website, we may automatically collect limited technical information such as:'],
        list: ['Device type', 'Browser type', 'IP address', 'Pages visited', 'Time spent on our website', 'Cookies and similar technologies'],
        footer: ['This information helps us improve our website and customer experience.'],
      },
    ],
  },
  {
    heading: 'How We Use Your Information',
    body: ['We use your information to:'],
    list: [
      'Process and deliver your orders.',
      'Provide customer support.',
      'Send order confirmations and tracking updates.',
      'Respond to your enquiries.',
      'Improve our website and services.',
      'Detect and prevent fraud or misuse.',
      'Comply with applicable legal requirements.',
      "Send promotional messages or marketing updates only where permitted or where you've chosen to receive them.",
    ],
    footer: ['We only collect information that is reasonably necessary to provide our services.'],
  },
  {
    heading: 'Payment Information',
    body: [
      'To keep your payments secure, all online payments are processed through trusted third-party payment providers.',
      'ZUNUZ does not store your complete debit card, credit card, UPI PIN, CVV, or banking credentials.',
      'Payment information is handled securely by our payment partners.',
    ],
  },
  {
    heading: 'Cookies',
    body: ['Our website uses cookies and similar technologies to:'],
    list: [
      'Improve website performance.',
      'Remember your preferences.',
      'Help you navigate the website more easily.',
      'Understand how visitors use our website.',
      'Improve your shopping experience.',
    ],
    footer: ['You can manage or disable cookies through your browser settings. Please note that some website features may not function properly if cookies are disabled.'],
  },
  {
    heading: 'Sharing Your Information',
    body: [
      'We value your trust.',
      'We do not sell, rent, or trade your personal information.',
      'We may share limited information only when necessary with trusted service providers such as:',
    ],
    list: [
      'Courier partners',
      'Payment service providers',
      'Technology and website service providers',
      'Government authorities or regulatory bodies where required by law',
    ],
    footer: ['These partners receive only the information necessary to perform their services.'],
  },
  {
    heading: 'Data Security',
    body: [
      'We take reasonable technical and organisational measures to help protect your personal information from unauthorised access, misuse, alteration, or disclosure.',
      'While we work hard to keep your information secure, no website or online service can guarantee absolute security.',
    ],
  },
  {
    heading: 'Your Choices',
    body: ['You may contact us at any time if you wish to:'],
    list: [
      'Update your personal information.',
      'Correct inaccurate information.',
      'Unsubscribe from promotional communications.',
      'Ask questions about how your information is used.',
    ],
    footer: ["We'll do our best to respond promptly."],
  },
  {
    heading: 'Third-Party Links',
    body: [
      'Our website may contain links to third-party websites or social media platforms.',
      'Once you leave the ZUNUZ website, their privacy practices will apply. We encourage you to review their privacy policies before sharing personal information.',
    ],
  },
  {
    heading: "Children's Privacy",
    body: [
      'Our website is not intended for children under the age required by applicable law to provide their own consent. If we become aware that personal information has been collected from a child without appropriate consent where required, we\'ll take reasonable steps to delete it.',
    ],
  },
  {
    heading: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time to reflect changes in our services, technology, or legal requirements.',
      'The latest version will always be available on our website.',
    ],
  },
  {
    heading: 'Contact Us',
    body: [
      'If you have any questions about this Privacy Policy or how your information is handled, please contact us through our official support channels listed on our website.',
      "Thank you for trusting ZUNUZ. We're committed to protecting your privacy and providing a safe, secure, and enjoyable shopping experience.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Privacy Policy</h2>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {SECTIONS.map((section, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F2EB', fontFamily: "'Qrokinex', sans-serif", letterSpacing: '0.04em' }}>
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
            {section.subsections?.map((sub, k) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#F5F2EB', letterSpacing: '0.03em' }}>{sub.subheading}</h4>
                {sub.body?.map((p, j) => (
                  <p key={j} style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>{p}</p>
                ))}
                {sub.list && (
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: 0, paddingLeft: '18px' }}>
                    {sub.list.map((item, j) => (
                      <li key={j} style={{ fontSize: '15px', lineHeight: 1.6, color: '#A1A1AA' }}>{item}</li>
                    ))}
                  </ul>
                )}
                {sub.footer?.map((p, j) => (
                  <p key={j} style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
