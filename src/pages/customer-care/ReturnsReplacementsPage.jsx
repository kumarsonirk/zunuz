import Seo from '../../components/Seo';
import { SEO_PAGES } from '../../seo/pages';
import PolicyLayout from '../../components/store/PolicyLayout';

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
    footer: [<>If your order arrives in any of the above conditions, please contact us within <strong className="font-semibold text-[#111110]">24 hours of delivery</strong>.</>],
  },
  {
    heading: 'How to Request a Replacement',
    body: ['To help us verify your request, please share:'],
    list: [
      'Your Order ID',
      'Clear photos of the product',
      <>An <strong className="font-semibold text-[#111110]">uninterrupted unboxing video</strong> recorded from the moment the sealed shipping package is opened until the product is fully visible.</>,
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
      <>Once processed by us, refunds generally reflect within <strong className="font-semibold text-[#111110]">5–7 business days</strong>, depending on your bank or payment provider.</>,
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
      <>Requests made after <strong className="font-semibold text-[#111110]">24 hours</strong> of delivery.</>,
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
  return (
    <PolicyLayout eyebrow="Customer care" title="Returns, Replacements & Refunds" accent="text-[#1A6FE8]" sections={SECTIONS}>
      <Seo {...SEO_PAGES['/customer-care/returns-replacements']} path="/customer-care/returns-replacements" />
    </PolicyLayout>
  );
}
