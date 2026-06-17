/**
 * transactionsCache.js
 * localStorage-backed cache for transactions data.
 * TTL: 5 minutes.
 */

const TTL_MS = 5 * 60 * 1000;

function dataKey(userId) {
  return `sellersync-txns-${userId}`;
}

function tsKey(userId) {
  return `sellersync-txns-ts-${userId}`;
}

/**
 * Read transactions from cache.
 * Returns { transactions: Array, isStale: boolean } or null.
 */
export function readTxnsCache(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return null;
    const ts = parseInt(localStorage.getItem(tsKey(userId)) || "0", 10);
    const transactions = JSON.parse(raw);
    const isStale = Date.now() - ts > TTL_MS;
    return { transactions, isStale };
  } catch {
    return null;
  }
}

/**
 * Write transactions to cache, refreshing the timestamp.
 */
export function writeTxnsCache(userId, transactions) {
  if (!userId) return;
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(transactions));
    localStorage.setItem(tsKey(userId), String(Date.now()));
  } catch {
    // Storage quota or private mode — fail silently
  }
}

/**
 * Touch the cache timestamp without replacing data.
 */
export function touchTxnsCache(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(tsKey(userId), String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Prepend a newly created transaction to the cache (optimistic insert).
 */
export function appendTxnToCache(userId, txn) {
  if (!userId || !txn) return;
  try {
    const cached = readTxnsCache(userId);
    const current = cached?.transactions ?? [];
    writeTxnsCache(userId, [txn, ...current]);
  } catch {
    // ignore
  }
}

/**
 * Remove all cached transactions for a user (call on logout).
 */
export function clearTxnsCache(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(dataKey(userId));
    localStorage.removeItem(tsKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Strip client-side enrichment flags before cache writes or comparisons.
 * _enriched is a UI-only annotation and must never affect equality checks.
 */
export function stripEnrichmentFlags(txns) {
  return txns.map(({ _enriched, ...rest }) => rest);
}

/**
 * Quick equality check on two transaction arrays.
 * Strips _enriched before comparing so client-side annotations don't
 * cause false mismatches and trigger the SyncBanner unnecessarily.
 */
export function txnsAreEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const clean = arr => stripEnrichmentFlags(arr);
  const sort  = arr => arr.toSorted((x, y) => String(x.id).localeCompare(String(y.id)));
  return JSON.stringify(sort(clean(a))) === JSON.stringify(sort(clean(b)));
}
