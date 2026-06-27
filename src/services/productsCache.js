/**
 * productsCache.js
 * localStorage-backed cache for products/inventory data.
 * TTL: 5 minutes.
 */

const TTL_MS = 5 * 60 * 1000;

function dataKey(userId) { return `sellersync-products-${userId}`; }
function tsKey(userId)   { return `sellersync-products-ts-${userId}`; }

export function readProductsCache(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return null;
    const ts = parseInt(localStorage.getItem(tsKey(userId)) || "0", 10);
    const products = JSON.parse(raw);
    const isStale = Date.now() - ts > TTL_MS;
    return { products, isStale };
  } catch { return null; }
}

export function writeProductsCache(userId, products) {
  if (!userId) return;
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(products));
    localStorage.setItem(tsKey(userId), String(Date.now()));
  } catch { /* quota / private mode */ }
}

export function touchProductsCache(userId) {
  if (!userId) return;
  try { localStorage.setItem(tsKey(userId), String(Date.now())); } catch { /**/ }
}

export function appendProductToCache(userId, product) {
  if (!userId || !product) return;
  try {
    const cached = readProductsCache(userId);
    const current = cached?.products ?? [];
    // Insert alphabetically by name
    const updated = [product, ...current].sort((a, b) => a.name.localeCompare(b.name));
    writeProductsCache(userId, updated);
  } catch { /**/ }
}

export function updateProductInCache(userId, updated) {
  if (!userId || !updated) return;
  try {
    const cached = readProductsCache(userId);
    if (!cached) return;
    const next = cached.products.map(p => p.id === updated.id ? updated : p);
    writeProductsCache(userId, next);
  } catch { /**/ }
}

export function removeProductFromCache(userId, productId) {
  if (!userId || !productId) return;
  try {
    const cached = readProductsCache(userId);
    if (!cached) return;
    writeProductsCache(userId, cached.products.filter(p => p.id !== productId));
  } catch { /**/ }
}

export function clearProductsCache(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(dataKey(userId));
    localStorage.removeItem(tsKey(userId));
  } catch { /**/ }
}

export function productsAreEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const sort = arr => arr.toSorted((x, y) => String(x.id).localeCompare(String(y.id)));
  return JSON.stringify(sort(a)) === JSON.stringify(sort(b));
}
