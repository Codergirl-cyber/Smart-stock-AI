import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, springConfig, CountUp } from "./components/UI";
import SyncBanner from "./components/SyncBanner";
import { motion } from "framer-motion";
import { ShoppingBag, AlertTriangle, Package, TrendingUp } from "lucide-react";
import AIRecommendations from "./components/AIRecommendations";
import AIInventoryCopilot from "./components/AIInventoryCopilot";
import AIBusinessReportWidget from "./components/AIBusinessReport";
import AgentActivity from "./components/AgentActivity";
import NotificationsBell from "./components/NotificationsBell";
import ExecCommandCenter from "./components/ExecCommandCenter";
import {
  readDashboardCache,
  writeDashboardCache,
  touchDashboardCache,
} from "./services/dashboardCache";

function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
    }
    return days;
}

function formatDayLabel(isoDate) {
    const d = new Date(isoDate + "T12:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short" });
}

function getTopProducts(orders, limit = 5) {
    const sales = {};
    orders.forEach((o) => {
        const name = o.product_name || "Unknown";
        sales[name] = (sales[name] || 0) + ((Number(o.price) * (Number(o.quantity) || 1)) || 0);
    });
    return Object.entries(sales)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
}

function enrichWithOrderStatus(transactions, orders) {
    if (!orders || orders.length === 0) return transactions;
    const orderMap = {};
    orders.forEach(o => { orderMap[o.id] = o; });

    return transactions.map(txn => {
        if (!txn.order_id) return txn;
        const linkedOrder = orderMap[txn.order_id];
        if (!linkedOrder) return txn;

        let updated = { ...txn };

        // Recover amount if the DB stored 0 or null
        const orderAmount = Number(linkedOrder.price || 0) * (Number(linkedOrder.quantity) || 1);
        if ((!updated.amount || updated.amount === 0) && orderAmount > 0) {
            updated.amount = orderAmount;
        }

        // Sync status with payment_status
        if (linkedOrder.payment_status === "paid" && updated.status === "pending") {
            updated.status = "success";
        } else if (linkedOrder.payment_status === "unpaid" && updated.status === "success") {
            updated.status = "pending";
        }

        return updated;
    });
}

/**
 * Derive a full dashboard snapshot from raw DB result sets.
 * Extracted so it can be used both in initial fetch and background sync.
 */
function deriveSnapshot(orders, products, transactions) {
    const enrichedTransactions = enrichWithOrderStatus(transactions, orders);

    const revenue = enrichedTransactions.filter(t => t.status === "success").reduce(
        (acc, t) => (t.type === "sale" || t.type === "credit" ? acc + (t.amount || 0) : acc - (t.amount || 0)),
        0
    );
    const ordersCount   = orders.length;
    const productsCount = products.length;
    const pendingCount  = orders.filter(o => o.delivery_status === "pending").length;
    const unpaidCount   = orders.filter(o => o.payment_status === "unpaid").length;
    const lowStock = products.filter(p => {
        const reorder = Number(p.reorder_level ?? 2);
        return Number(p.stock ?? 0) <= reorder;
    });

    const stats = [
        { label: "Revenue",  value: revenue,       prefix: "Rs " },
        { label: "Orders",   value: ordersCount },
        { label: "Products", value: productsCount },
        { label: "Pending",  value: pendingCount },
    ];

    const dayKeys = getLast7Days();
    const salesByDay = Object.fromEntries(dayKeys.map(d => [d, 0]));
    enrichedTransactions.forEach(t => {
        if (t.status === "success" && (t.type === "sale" || t.type === "credit") && t.created_at) {
            const day = t.created_at.split("T")[0];
            if (day in salesByDay) salesByDay[day] += t.amount || 0;
        }
    });
    const chartData = dayKeys.map(date => ({ date, amount: salesByDay[date] }));

    const recentActivity = orders.slice(0, 6).map(o => ({
        id: o.id,
        type: "order",
        title: o.customer_name,
        subtitle: o.product_name || "Order",
        date: o.order_date,
        meta: `${o.payment_status} · ${o.delivery_status}`,
        amount: o.price,
    }));

    const topProducts = getTopProducts(orders);

    const pricesByDate = dayKeys.map(date => salesByDay[date]);
    const weekendOrders = orders.filter(o => {
        const day = new Date(o.order_date).getDay();
        return day === 0 || day === 6;
    }).length;
    const weekdayOrders = orders.length - weekendOrders;
    const weekendRatio = weekdayOrders === 0 ? 2.3 : Number(((weekendOrders / 2) / Math.max(1, weekdayOrders / 5)).toFixed(1));
    const prevWeek   = pricesByDate.slice(0, 7).reduce((a, b) => a + b, 0);
    const recentWeek = pricesByDate.slice(7).reduce((a, b) => a + b, 0);
    const trendValue = prevWeek === 0 ? (recentWeek > 0 ? 24 : 0) : Math.round(((recentWeek - prevWeek) / Math.max(1, prevWeek)) * 100);
    const topProductName = topProducts[0]?.name || 'Top SKU';

    const forecastSummary = {
        trend: `${trendValue >= 0 ? '+' : ''}${trendValue}%`,
        weekend: `Weekend demand is ${weekendRatio.toFixed(1)}x higher.`,
        stockouts: lowStock.length,
        headline: `${topProductName} is driving demand this week.`,
    };

    const insights = [];
    if (unpaidCount > 0) {
        insights.push({ type: "warning", message: `${unpaidCount} order${unpaidCount > 1 ? "s" : ""} awaiting payment.`, link: "/orders", linkLabel: "Review orders" });
    }
    if (lowStock.length > 0) {
        insights.push({ type: "warning", message: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} low on stock.`, link: "/products", linkLabel: "Update inventory" });
    }

    return { stats, chartData, recentActivity, topProducts, forecastSummary, insights };
}

/** Quick equality check on two snapshots via JSON */
function snapshotsAreEqual(a, b) {
    if (!a || !b) return false;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

const Dashboard = () => {
    const [stats, setStats] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [insights, setInsights] = useState([]);
    const [forecastSummary, setForecastSummary] = useState({ trend: '+0%', weekend: 'Weekend demand steady.', stockouts: 0, headline: 'Demand is stable' });
    const [loading, setLoading] = useState(true);
    const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

    // Sync-banner
    const [staleBanner, setStaleBanner] = useState(false);
    const [applyingSyncData, setApplyingSyncData] = useState(false);
    const freshSnapshotRef = useRef(null);

    const { user } = useAuth();

    // ─── Apply a snapshot to all state slices ────────────────────────────────

    const applySnapshot = (snap) => {
        setStats(snap.stats);
        setChartData(snap.chartData);
        setRecentActivity(snap.recentActivity);
        setTopProducts(snap.topProducts);
        setForecastSummary(snap.forecastSummary);
        setInsights(snap.insights);
    };

    // ─── Cache-first load ────────────────────────────────────────────────────

    const loadFromCache = () => {
        if (!user) return false;
        const cached = readDashboardCache(user.id);
        if (cached) {
            applySnapshot(cached.snapshot);
            setLoading(false);
            return true;
        }
        return false;
    };

    const syncFromDB = async (force = false) => {
        if (!user) return;
        try {
            const [ordersRes, productsRes, transRes] = await Promise.all([
                supabase.from("orders").select("id, customer_name, product_name, price, quantity, payment_status, delivery_status, order_date").eq("user_id", user.id).order("order_date", { ascending: false }),
                supabase.from("products").select("id, name, stock, reorder_level").eq("user_id", user.id),
                supabase.from("transactions").select("amount, type, created_at, status, order_id").eq("user_id", user.id),
            ]);

            const orders       = ordersRes.data   || [];
            const products     = productsRes.data  || [];
            const transactions = transRes.data     || [];

            const freshSnap = deriveSnapshot(orders, products, transactions);

            if (force) {
                applySnapshot(freshSnap);
                writeDashboardCache(user.id, freshSnap);
                setStaleBanner(false);
                return;
            }

            const cached = readDashboardCache(user.id);
            if (cached && snapshotsAreEqual(cached.snapshot, freshSnap)) {
                touchDashboardCache(user.id);
            } else if (!cached) {
                applySnapshot(freshSnap);
                writeDashboardCache(user.id, freshSnap);
            } else {
                freshSnapshotRef.current = freshSnap;
                setStaleBanner(true);
            }
        } catch (err) {
            console.warn("[Dashboard] Background sync failed:", err.message);
        }
    };

    const handleApplySync = async () => {
        setApplyingSyncData(true);
        if (freshSnapshotRef.current) {
            applySnapshot(freshSnapshotRef.current);
            writeDashboardCache(user.id, freshSnapshotRef.current);
            freshSnapshotRef.current = null;
            setStaleBanner(false);
            setApplyingSyncData(false);
        } else {
            await syncFromDB(true);
            setApplyingSyncData(false);
        }
    };

    // ─── Mount effect + event listener ──────────────────────────────────────

    useEffect(() => {
        if (!user) { setLoading(false); return; }

        const cacheHit = loadFromCache();
        if (!cacheHit) {
            setLoading(true);
            syncFromDB(true).finally(() => setLoading(false));
        } else {
            syncFromDB(false);
        }

        // Re-sync when orders/products change (triggered by other pages)
        const handler = () => syncFromDB(true);
        window.addEventListener('sellersync-data-changed', handler);
        return () => window.removeEventListener('sellersync-data-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // ─── Demo / render helpers ───────────────────────────────────────────────

    const demoChartData = [
        { date: getLast7Days()[0], amount: 7800  },
        { date: getLast7Days()[1], amount: 9400  },
        { date: getLast7Days()[2], amount: 8600  },
        { date: getLast7Days()[3], amount: 10200 },
        { date: getLast7Days()[4], amount: 9400  },
        { date: getLast7Days()[5], amount: 10800 },
        { date: getLast7Days()[6], amount: 11200 },
    ];

    const chartDataToRender = !loading && chartData.every(d => d.amount === 0) && demoMode ? demoChartData : chartData;

    const demoTopProducts = [
        { name: 'Executive Notebook', revenue: 14200 },
        { name: 'Premium Pen Set',    revenue:  9800 },
        { name: 'Wireless Charger',   revenue:  7600 },
        { name: 'Desk Organizer',     revenue:  5200 },
        { name: 'Coffee Mug',         revenue:  4400 },
    ];

    const topProductsToRender = !loading && topProducts.length === 0 && demoMode ? demoTopProducts : topProducts;

    const chartMax = useMemo(
        () => Math.max(...chartDataToRender.map(d => d.amount), 1),
        [chartDataToRender]
    );

    const topMax = useMemo(
        () => Math.max(...topProductsToRender.map(p => p.revenue), 1),
        [topProductsToRender]
    );

    return (
        <div className="page-shell">
            <header style={{ marginBottom: "40px" }}>
                <h1 className="h1">Dashboard</h1>
                <p className="subheading" style={{ marginTop: '8px' }}>Your business performance at a glance.</p>
                {demoMode && (
                    <div className="caption" style={{ marginTop: '10px', color: 'var(--accent)' }}>
                        Demo mode is active — analytics and AI widgets show polished fallback insights.
                    </div>
                )}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '16px', marginBottom: '20px' }}>
                <AIInventoryCopilot />
                <AIBusinessReportWidget />
            </div>

            {/* Sync Banner */}
            <SyncBanner
                visible={staleBanner}
                syncing={applyingSyncData}
                message="Dashboard data has been updated — click Apply to refresh your stats."
                onApply={handleApplySync}
                onDismiss={() => setStaleBanner(false)}
            />

            {!loading && insights.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                    {insights.map((item, i) => (
                        <div key={i} className="insight-banner insight-banner--warning">
                            <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div style={{ flex: 1 }}>
                                <span>{item.message} </span>
                                <Link to={item.link} style={{ color: "var(--accent)", fontWeight: "600", fontSize: "13px" }}>
                                    {item.linkLabel} →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "16px", marginBottom: "48px" }}
            >
                {loading ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="stat-card">
                        <div className="skeleton" style={{ width: "60px", height: "12px", marginBottom: "12px" }} />
                        <div className="skeleton" style={{ width: "100px", height: "28px" }} />
                    </div>
                )) : stats.map((s, i) => (
                    <motion.div
                        key={i}
                        className="stat-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springConfig, delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                    >
                        <div className="caption" style={{ marginBottom: "12px" }}>{s.label}</div>
                        <div className="h2">
                            {s.prefix}{typeof s.value === "number" ? <CountUp end={s.value} /> : s.value}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div className="panel-card" style={{ minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <div className="caption" style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>AI Insights</div>
                        <h3 style={{ margin: 0 }}>{forecastSummary.headline}</h3>
                        <p className="body" style={{ color: 'var(--text-muted)', marginTop: '10px' }}>{forecastSummary.weekend}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                        <div>
                            <div className="caption">Trend</div>
                            <div className="h2" style={{ marginTop: '6px' }}>{forecastSummary.trend}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="caption">Recharge risk</div>
                            <div className="h2" style={{ marginTop: '6px' }}>{forecastSummary.stockouts}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                    <NotificationsBell />
                    <ExecCommandCenter />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                <AgentActivity />
            </div>

            <motion.div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "24px" }}
            >
                <div className="panel-card">
                    <h3 className="caption" style={{ marginBottom: "8px", color: "var(--text-primary)" }}>7-Day Sales</h3>
                    <p className="body" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>Revenue from sales in your ledger</p>
                    {loading ? (
                        <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "10px" }}>
                            {Array(7).fill(0).map((_, i) => (
                                <div key={i} className="skeleton" style={{ flex: 1, height: "60%" }} />
                            ))}
                        </div>
                    ) : chartDataToRender.every(d => d.amount === 0) ? (
                        <div className="body" style={{ color: "var(--text-muted)", textAlign: "center", padding: "48px 16px", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)" }}>
                            No sales recorded in the last 7 days.
                        </div>
                    ) : (
                        <div>
                            <div style={{ height: "200px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-end", gap: "10px" }}>
                                {chartDataToRender.map((day, i) => {
                                    const heightPct = Math.max(8, (day.amount / chartMax) * 100);
                                    const isPeak = day.amount === chartMax && day.amount > 0;
                                    return (
                                        <motion.div
                                            key={day.date}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${heightPct}%` }}
                                            transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                                            title={`Rs ${day.amount.toLocaleString()}`}
                                            style={{
                                                flex: 1,
                                                background: isPeak ? "linear-gradient(180deg, var(--accent), var(--accent-hover))" : "var(--surface-hover)",
                                                borderRadius: "2px 2px 0 0",
                                                minHeight: "4px",
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                {chartDataToRender.map(day => (
                                    <span key={day.date} className="caption" style={{ flex: 1, textAlign: "center", fontSize: "10px" }}>
                                        {formatDayLabel(day.date)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="panel-card">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <TrendingUp size={16} color="var(--accent)" />
                        <h3 className="caption" style={{ color: "var(--text-primary)" }}>Top Products</h3>
                    </div>
                    <p className="body" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "20px" }}>By order revenue</p>
                    {loading ? (
                        Array(4).fill(0).map((_, i) => <Skeleton key={i} height="36px" className="mb-2" />)
                    ) : topProductsToRender.length === 0 ? (
                        <p className="body" style={{ color: "var(--text-muted)", fontSize: "13px" }}>No product sales yet.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {topProductsToRender.map(p => (
                                <div key={p.name}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                                        <span style={{ fontWeight: "600" }}>{p.name}</span>
                                        <span className="mono" style={{ fontWeight: "600" }}>Rs {p.revenue.toLocaleString()}</span>
                                    </div>
                                    <div style={{ height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                                        <div style={{ width: `${(p.revenue / topMax) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: "3px" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <AIRecommendations />
            </motion.div>

            <div className="panel-card">
                <h3 className="caption" style={{ marginBottom: "24px", color: "var(--text-primary)" }}>Recent Activity</h3>
                {loading ? (
                    Array(3).fill(0).map((_, i) => <Skeleton key={i} height="48px" className="mb-2" />)
                ) : recentActivity.length === 0 ? (
                    <div className="body" style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)" }}>
                        <Package size={20} style={{ marginBottom: "8px", opacity: 0.5 }} />
                        <p>Create your first order to see activity here.</p>
                        <Link to="/orders" style={{ color: "var(--accent)", fontWeight: "600", fontSize: "13px" }}>Add order →</Link>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {recentActivity.map(item => (
                            <div key={item.id} className="activity-row">
                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <ShoppingBag size={16} color="var(--accent)" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.title}</div>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.subtitle} · {item.meta}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div className="mono" style={{ fontWeight: "600", fontSize: "13px" }}>Rs {Number(item.amount || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                        {item.date ? new Date(item.date).toLocaleDateString() : "—"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
