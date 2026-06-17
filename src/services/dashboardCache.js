/**
 * dashboardCache.js
 * localStorage-backed cache for the dashboard's derived stats snapshot.
 * Unlike the other caches, this stores a computed snapshot (stats, chartData, etc.)
 * rather than raw DB rows, so the dashboard renders instantly from cache.
 * TTL: 5 minutes.
 */

const TTL_MS = 5 * 60 * 1000;

function dataKey(userId) { return `sellersync-dash-${userId}`; }
function tsKey(userId)   { return `sellersync-dash-ts-${userId}`; }

/**
 * Read dashboard snapshot from cache.
 * Returns { snapshot, isStale } or null.
 * snapshot = { stats, chartData, recentActivity, topProducts, forecastSummary, insights }
 */
export function readDashboardCache(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return null;
    const ts = parseInt(localStorage.getItem(tsKey(userId)) || "0", 10);
    const snapshot = JSON.parse(raw);
    const isStale = Date.now() - ts > TTL_MS;
    return { snapshot, isStale };
  } catch { return null; }
}

export function writeDashboardCache(userId, snapshot) {
  if (!userId) return;
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(snapshot));
    localStorage.setItem(tsKey(userId), String(Date.now()));
  } catch { /**/ }
}

export function touchDashboardCache(userId) {
  if (!userId) return;
  try { localStorage.setItem(tsKey(userId), String(Date.now())); } catch { /**/ }
}

export function clearDashboardCache(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(dataKey(userId));
    localStorage.removeItem(tsKey(userId));
  } catch { /**/ }
}
