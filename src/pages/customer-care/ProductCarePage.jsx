import Seo from '../../components/Seo';
import PolicyLayout from '../../components/store/PolicyLayout';

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
    <PolicyLayout eyebrow="Customer care" title="Product Care Guide" accent="text-[#1E8A4C]" sections={SECTIONS}>
      <Seo
        title="Product Care Guide"
        description="Tips for caring for, cleaning, and storing your ZUNUZ fashion jewelry to help keep it looking its best for longer."
        path="/customer-care/product-care"
      />
    </PolicyLayout>
  );
}
