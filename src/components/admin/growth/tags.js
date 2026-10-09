// Customer tag presets + colours (CustomerTags.jsx, CustomersPage).
export const SUGGESTED_TAGS = ['VIP', 'Wholesale', 'Influencer', 'Needs follow-up', 'Fraud risk'];
const TAG_TONE = { vip: 'yellow', wholesale: 'blue', influencer: 'purple', 'needs follow-up': 'pink', 'fraud risk': 'red' };
export const tagTone = (t) => TAG_TONE[String(t).toLowerCase()] || 'green';
