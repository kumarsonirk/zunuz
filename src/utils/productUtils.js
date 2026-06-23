import { productData, wp } from '../data/productData';

export function findProductById(id) {
  for (const collection of Object.values(productData)) {
    for (const type of ['necklaces', 'earrings', 'bracelets']) {
      const found = collection[type]?.find(p => p.id === id);
      if (found) return found;
    }
  }
  return null;
}

export function findCategoryByProductId(productId) {
  for (const [key, collection] of Object.entries(productData)) {
    for (const type of ['necklaces', 'earrings', 'bracelets']) {
      const found = collection[type]?.some(p => p.id === productId);
      if (found) {
        return wp.find(category => category.id === key) || null;
      }
    }
  }
  return null;
}

