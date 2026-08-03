function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Appends -2, -3, ... until a free slug is found. `excludeId` lets an update
// path check uniqueness while ignoring the row being updated (unused today
// since slugs are only generated on create, kept for future reuse).
async function generateUniqueSlug(prisma, name, excludeId = null) {
  const base = slugify(name) || 'product';
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
  }
}

module.exports = { slugify, generateUniqueSlug };
