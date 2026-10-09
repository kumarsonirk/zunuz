import { INDIAN_STATES } from '../../../utils/address';

// Forgiving parser for the "bulk add pincodes" box. One pincode per line:
//   560001, Bengaluru, Karnataka, cod, 2-4 days
//   560002	Bengaluru	Karnataka	no cod	3 days
//   400001 Mumbai
// Separators: comma, tab, semicolon or "|". Order of the extra fields
// doesn't matter much — COD flags, delivery times and state names are
// recognised wherever they are; the first other word is the city.
// Returns { rows, errors, duplicates } (rows ready for POST /bulk).

const STATE_BY_KEY = new Map(INDIAN_STATES.map((s) => [s.toLowerCase().replace(/[^a-z]/g, ''), s]));
const STATE_ALIASES = { orissa: 'Odisha', pondicherry: 'Puducherry', newdelhi: 'Delhi', nctofdelhi: 'Delhi', jk: 'Jammu and Kashmir', up: 'Uttar Pradesh', mp: 'Madhya Pradesh', tn: 'Tamil Nadu', wb: 'West Bengal', ap: 'Andhra Pradesh', ka: 'Karnataka', mh: 'Maharashtra', uk: 'Uttarakhand', hp: 'Himachal Pradesh' };
const matchState = (t) => {
  const k = t.toLowerCase().replace(/[^a-z]/g, '');
  return STATE_BY_KEY.get(k) || STATE_ALIASES[k] || null;
};

const COD_YES = /^(cod|cod\s*(yes|y|ok|available|on)|yes|y|true)$/i;
const COD_NO = /^(no\s*cod|non[\s-]?cod|cod\s*(no|n|off|not\s*available)|prepaid(\s*only)?|online(\s*only)?|no|n|false)$/i;
const INACTIVE = /^(inactive|off|disabled|paused)$/i;
const ACTIVE = /^(active|on|enabled)$/i;
// "2-4 days", "2 to 4", "3 days", "3d", "2–4"
const ETA = /^(\d{1,2})\s*(?:(?:-|–|—|to)\s*(\d{1,2}))?\s*(d|day|days|business\s*days|working\s*days)?$/i;

const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

// A line with only spaces ("560001 Bengaluru Karnataka no cod 3 days"):
// pull out the flags, delivery time and state (it can be several words),
// what's left is the city. Returns tokens like the comma-separated form.
const FLAG_PATTERNS = [
  /\b(?:no\s*cod|non[\s-]?cod|cod\s*(?:no|n|off|not\s*available)|prepaid(?:\s*only)?|online\s*only)\b/i,
  /\b(?:inactive|disabled|paused)\b/i,
  /\bcod(?:\s*(?:yes|ok|available))?\b/i,
  /\b\d{1,2}\s*(?:-|–|—|to)\s*\d{1,2}(?:\s*(?:business\s*|working\s*)?days?)?\b|\b\d{1,2}\s*(?:business\s*|working\s*)?days?\b/i,
];
function splitSpaced(line) {
  const m = line.match(/^(\d{3}\s?\d{3})\s+(.*)$/);
  let rest = ` ${m[2]} `;
  const tokens = [m[1]];
  FLAG_PATTERNS.forEach((re) => {
    const hit = rest.match(re);
    if (hit) { tokens.push(hit[0].trim()); rest = rest.replace(hit[0], ' '); }
  });
  rest = rest.replace(/\s+/g, ' ').trim();
  const lower = rest.toLowerCase();
  const full = INDIAN_STATES.find((s) => lower === s.toLowerCase() || lower.endsWith(` ${s.toLowerCase()}`));
  let city = rest;
  if (full) { tokens.push(full); city = rest.slice(0, rest.length - full.length).trim(); }
  else {
    const words = rest.split(' ');
    const last = words.length > 1 && matchState(words[words.length - 1]);
    if (last) { tokens.push(last); city = words.slice(0, -1).join(' '); }
  }
  if (city) tokens.splice(1, 0, city);
  return tokens;
}

export function parsePincodeLines(text) {
  const rows = [];
  const errors = [];
  const seen = new Map();
  let duplicates = 0;

  String(text || '').split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    let tokens = line.split(/[,\t;|]/).map((t) => t.trim()).filter(Boolean);
    // "560001 Bengaluru Karnataka" with only spaces → pincode + rest.
    if (tokens.length === 1 && /^\d{3}\s?\d{3}\s+\S/.test(tokens[0])) tokens = splitSpaced(tokens[0]);
    const pinIdx = tokens.findIndex((t) => /^\d{3}\s?\d{3}$/.test(t));
    if (pinIdx < 0) {
      // A header row ("pincode, city, state…") is skipped quietly.
      if (idx === 0 && /pin/i.test(line)) return;
      errors.push({ line: idx + 1, text: line, error: 'No 6-digit pincode found.' });
      return;
    }
    const pincode = tokens[pinIdx].replace(/\s/g, '');
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      errors.push({ line: idx + 1, text: line, error: `${pincode} isn't a valid Indian pincode (can't start with 0).` });
      return;
    }
    const row = { pincode, city: '', state: '', codAvailable: true, etaDays: '', isActive: true };
    const words = [];
    tokens.forEach((t, i) => {
      if (i === pinIdx) return;
      const eta = t.match(ETA);
      if (COD_NO.test(t)) row.codAvailable = false;
      else if (COD_YES.test(t)) row.codAvailable = true;
      else if (INACTIVE.test(t)) row.isActive = false;
      else if (ACTIVE.test(t)) row.isActive = true;
      else if (eta) row.etaDays = eta[2] ? `${eta[1]}–${eta[2]} days` : `${eta[1]} day${eta[1] === '1' ? '' : 's'}`;
      else words.push(t);
    });
    // A recognised state name goes to state, the first other word is the city.
    // (searched from the end, so "New Delhi, Delhi" keeps New Delhi as the city)
    let stIdx = -1;
    for (let i = words.length - 1; i >= 0 && stIdx < 0; i--) if (matchState(words[i])) stIdx = i;
    if (stIdx >= 0) row.state = matchState(words[stIdx]);
    const rest = words.filter((_, i) => i !== stIdx);
    if (rest[0]) row.city = titleCase(rest[0]).slice(0, 80);
    if (!row.state && rest[1]) row.state = titleCase(rest[1]).slice(0, 80);
    if (rest.length > 2) row.note = `Ignored: ${rest.slice(2).join(', ')}`;
    if (seen.has(pincode)) { duplicates += 1; rows[seen.get(pincode)] = row; return; }
    seen.set(pincode, rows.length);
    rows.push(row);
  });

  return { rows, errors, duplicates };
}
