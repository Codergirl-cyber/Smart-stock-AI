/**
 * ordersCache.js
 * localStorage-backed cache for orders data.
 * TTL: 5 minutes — after which a background refresh is always forced.
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

function dataKey(userId) {
  return `sellersync-orders-${userId}`;
}

function tsKey(userId) {
  return `sellersync-orders-ts-${userId}`;
}

/**
 * Read orders from cache.
 * Returns { orders: Array, isStale: boolean } or null if no cache exists.
 * isStale = true when cache is older than TTL (still usable, but DB sync should run).
 */
export function readOrdersCache(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return null;
    const ts = parseInt(localStorage.getItem(tsKey(userId)) || "0", 10);
    const orders = JSON.parse(raw);
    const isStale = Date.now() - ts > TTL_MS;
    return { orders, isStale };
  } catch {
    return null;
  }
}

/**
 * Write orders to cache, refreshing the timestamp.
 */
export function writeOrdersCache(userId, orders) {
  if (!userId) return;
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(orders));
    localStorage.setItem(tsKey(userId), String(Date.now()));
  } catch {
    // Storage quota or private mode — fail silently
  }
}

/**
 * Touch the cache timestamp without replacing data
 * (used when DB and cache match perfectly).
 */
export function touchOrdersCache(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(tsKey(userId), String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Append a single new order to the cache (for optimistic inserts).
 * The order is prepended so it appears at the top of the list.
 */
function appendOrderToCache(userId, order) {
  if (!userId || !order) return;
  try {
    const cached = readOrdersCache(userId);
    const current = cached?.orders ?? [];
    writeOrdersCache(userId, [order, ...current]);
  } catch {
    // ignore
  }
}

/**
 * Remove all cached orders for a user (call on logout).
 */
export function clearOrdersCache(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(dataKey(userId));
    localStorage.removeItem(tsKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Quick deep-equality check on two order arrays by comparing JSON.
 * Returns true if they represent identical data.
 */
export function ordersAreEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  // Compare sorted by id to be safe
  const sort = (arr) => arr.toSorted((x, y) => String(x.id).localeCompare(String(y.id)));
  return JSON.stringify(sort(a)) === JSON.stringify(sort(b));
}
