import { JEWELLERY_CATEGORY_SLUGS } from './catalogConfig';

// "Best paired with" on the product page: up to `count` pieces of the OTHER
// types that go with this one (earrings → necklaces + bracelets, …).
// 1. The admin's own picks first (Admin → Products → "Best paired with"),
//    in the order chosen, if they're still on sale and in stock.
// 2. The rest picked automatically, by how well each candidate matches:
//    - finish (gold-tone with gold-tone, oxidised / silver-tone together) —
//      the strongest signal, since mixed metals rarely look right;
//    - shared stone / colour (green, pink, pearl, crystal…) and motif
//      (floral, heart, butterfly…), read from the name + details;
//    - price close to this piece's;
//    taking the best of each other type in turn, so the list is mixed.
//    Poor matches (a different metal finish) only fill in when nothing
//    better is left. Sets (necklace + earrings) pair with bracelets only.

const FINISH = [
  ['silver', /oxidi[sz]ed|silver[- ]tone|antique silver|\bsilver\b/],
  ['gold', /gold[- ]tone|\bgold\b|golden|18k/],
];
const TRAITS = [
  /green|emerald/, /pink|rose\b|blush/, /\bred\b|ruby|maroon/, /\bwhite\b/, /\bblack\b/, /\bblue\b|sapphire|ocean|navy/,
  /purple|lilac|violet/, /pearl/, /crystal|zircon|cz\b|sparkl/, /\bstone\b/, /enamel/,
  /floral|flower|petal|rose\b/, /heart/, /butterfly/, /leaf|ginkgo/, /\bstar\b|celestial/, /moon|lunar/,
  /cross/, /solitaire/, /geometric|square|hexagon/, /charm/, /jhumka|temple|ethnic|traditional/,
];

const textOf = (p) => `${p.name} ${p.tagline || ''} ${p.productDetails || ''}`.toLowerCase();
const finishOf = (text) => (FINISH.find(([, re]) => re.test(text)) || [null])[0];
const typeOf = (p) => (JEWELLERY_CATEGORY_SLUGS.includes(p.categorySlug) ? p.categorySlug : p.subcategorySlug);

function score(base, baseText, baseFinish, c) {
  const text = textOf(c);
  let s = 0;
  const f = finishOf(text);
  if (baseFinish && f) s += baseFinish === f ? 6 : -6;
  TRAITS.forEach((re) => { if (re.test(baseText) && re.test(text)) s += 2; });
  if (base.price > 0) s += Math.max(0, 2 - (Math.abs(c.price - base.price) / base.price) * 2);
  if (base.categorySlug === 'festive-glow' && c.categorySlug === 'festive-glow') s += 1;
  return s;
}

export function bestPairs(product, products, count = 3) {
  if (!product) return [];
  const type = typeOf(product);
  const otherTypes = type === 'set' ? ['bracelets'] : JEWELLERY_CATEGORY_SLUGS.filter((t) => t !== type);
  const ok = (p) => p.id !== product.id && p.isActive !== false && p.stock > 0 && otherTypes.includes(typeOf(p));
  const byId = new Map(products.map((p) => [String(p.id), p]));

  const picked = (product.pairsWith || []).map((id) => byId.get(String(id))).filter((p) => p && ok(p)).slice(0, count);
  if (picked.length >= count) return picked;

  const baseText = textOf(product);
  const baseFinish = finishOf(baseText);
  const taken = new Set(picked.map((p) => p.id));
  const scored = otherTypes.map((t) => products
    .filter((p) => ok(p) && typeOf(p) === t && !taken.has(p.id))
    .map((p) => ({ p, s: score(product, baseText, baseFinish, p) }))
    .sort((a, b) => b.s - a.s));
  // Good matches first, alternating between the types…
  const good = scored.map((l) => l.filter((x) => x.s >= 0).map((x) => x.p));
  for (let i = 0; picked.length < count && good.some((l) => l[i]); i += 1) {
    good.forEach((l) => { if (l[i] && picked.length < count) picked.push(l[i]); });
  }
  // …then, only if still short, the best of the rest.
  if (picked.length < count) {
    const rest = scored.flat().filter((x) => !picked.includes(x.p)).sort((a, b) => b.s - a.s);
    picked.push(...rest.slice(0, count - picked.length).map((x) => x.p));
  }
  return picked;
}
