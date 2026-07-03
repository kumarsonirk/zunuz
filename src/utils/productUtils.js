import { productData, wp } from '../data/productData';

function subcategoryKeys(collection) {
  return Object.keys(collection).filter(k => Array.isArray(collection[k]));
}

export function findProductById(id, data = productData) {
  for (const collection of Object.values(data)) {
    for (const type of subcategoryKeys(collection)) {
      const found = collection[type]?.find(p => p.id === id);
      if (found) return found;
    }
  }
  return null;
}

export function findCategoryByProductId(productId, data = productData) {
  for (const [key, collection] of Object.entries(data)) {
    for (const type of subcategoryKeys(collection)) {
      const found = collection[type]?.some(p => p.id === productId);
      if (found) {
        return wp.find(category => category.id === key) || { id: key, title: collection.title };
      }
    }
  }
  return null;
}

