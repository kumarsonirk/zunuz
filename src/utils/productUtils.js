import { productData, wp } from '../data/productData';

function subcategoryKeys(collection) {
  return Object.keys(collection).filter(k => Array.isArray(collection[k]));
}

// Matches by slug (the public URL) first, falling back to the numeric id —
// covers products created before slugs existed and any already-shared link.
export function findProductBySlug(slugOrId, data = productData) {
  for (const collection of Object.values(data)) {
    for (const type of subcategoryKeys(collection)) {
      const found = collection[type]?.find(p => p.slug === slugOrId || p.id === slugOrId);
      if (found) return found;
    }
  }
  return null;
}

export function findCategoryByProductSlug(slugOrId, data = productData) {
  for (const [key, collection] of Object.entries(data)) {
    for (const type of subcategoryKeys(collection)) {
      const found = collection[type]?.some(p => p.slug === slugOrId || p.id === slugOrId);
      if (found) {
        return wp.find(category => category.id === key) || { id: key, title: collection.title };
      }
    }
  }
  return null;
}
