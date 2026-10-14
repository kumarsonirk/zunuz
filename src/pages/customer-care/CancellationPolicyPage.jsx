import Seo from '../../components/Seo';
import { SEO_PAGES } from '../../seo/pages';
import PolicyLayout from '../../components/store/PolicyLayout';

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
      <>Orders can be cancelled within <strong className="font-semibold text-[#111110]">6 hours</strong> of being placed.</>,
      'Once an order has been packed or shipped, it can no longer be cancelled.',
    ],
    footer: ['We begin processing orders quickly to ensure fast delivery, which is why cancellation is only possible within the above time frame.'],
  },
  {
    heading: 'How to Cancel',
    list: [
      <>Go to <strong className="font-semibold text-[#111110]">My account → Orders</strong>, open the order and tap <strong className="font-semibold text-[#111110]">Cancel order</strong>. It’s instant — you’ll get a confirmation email.</>,
      'Can’t see the button? Contact our support team as soon as possible with your Order ID and we’ll check whether it can still be cancelled.',
    ],
  },
  {
    heading: 'Refund for Cancelled Orders',
    body: [
      'When a prepaid order is cancelled, the refund is started automatically to the original payment method used while placing the order.',
      <>For prepaid orders, refunds are generally processed within <strong className="font-semibold text-[#111110]">5–7 business days</strong>, depending on your bank or payment provider.</>,
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
  return (
    <PolicyLayout eyebrow="Customer care" title="Cancellation Policy" accent="text-[#E8304F]" sections={SECTIONS}>
      <Seo {...SEO_PAGES['/customer-care/cancellation-policy']} path="/customer-care/cancellation-policy" />
    </PolicyLayout>
  );
}
