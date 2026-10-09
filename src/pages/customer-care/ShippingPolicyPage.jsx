import Seo from '../../components/Seo';
import { SETTINGS } from '../../store/settings';
import PolicyLayout from '../../components/store/PolicyLayout';

// Delivery area note — shown while delivery is limited to listed pincodes
// (admin Settings → "Only deliver to listed pincodes").
const AREA = SETTINGS.pincodeRestriction ? [{
  heading: 'Where We Deliver',
  body: [<>For now, ZUNUZ delivers within <strong className="font-semibold text-[#111110]">Bengaluru</strong> only — most orders arrive in <strong className="font-semibold text-[#111110]">1–3 days</strong>.</>, 'You can check your pincode on any product page. We’re working on bringing ZUNUZ to more cities soon.'],
}] : [];

const SECTIONS = [
  ...AREA,
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
      <>Most orders are carefully packed and dispatched within <strong className="font-semibold text-[#111110]">12 hours</strong> after your order is successfully confirmed.</>,
      'Orders placed on Sundays or public holidays may be processed on the next working day.',
      "During product launches, festive seasons, or high-demand periods, processing may take a little longer. If this happens, we'll do our best to keep you updated.",
    ],
  },
  {
    heading: 'Delivery Time',
    body: [<>Most ZUNUZ orders are delivered within <strong className="font-semibold text-[#111110]">2–7 business days</strong>, depending on your delivery location.</>, 'While we always aim for the fastest possible delivery, timelines may occasionally vary due to:'],
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
    <PolicyLayout eyebrow="Customer care" title="Shipping & Delivery" accent="text-[#FF3D8B]" sections={SECTIONS}>
      <Seo
        title="Shipping Policy"
        description="Learn about ZUNUZ's order processing times, delivery timelines, shipping charges, and how lost or damaged shipments are handled."
        path="/customer-care/shipping-policy"
      />
    </PolicyLayout>
  );
}
