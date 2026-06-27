import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
<<<<<<< HEAD
import { Button, CountUp } from "./components/UI";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingBag,
    AlertTriangle,
    Package,
    TrendingUp,
    Clock,
    Truck,
    Plus,
    Activity,
    Brain,
    Sparkles,
    Calendar,
    ArrowRight
} from "lucide-react";
=======
import { Skeleton, springConfig, CountUp } from "./components/UI";
import SyncBanner from "./components/SyncBanner";
import { motion } from "framer-motion";
import { ShoppingBag, AlertTriangle, Package, TrendingUp } from "lucide-react";
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
import AIRecommendations from "./components/AIRecommendations";
import AIInventoryCopilot from "./components/AIInventoryCopilot";
import AIBusinessReportWidget from "./components/AIBusinessReport";
import NotificationsBell from "./components/NotificationsBell";
<<<<<<< HEAD
=======
import ExecCommandCenter from "./components/ExecCommandCenter";
import {
  readDashboardCache,
  writeDashboardCache,
  touchDashboardCache,
} from "./services/dashboardCache";
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3

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

function StatusBadge({ type, children }) {
    return <span className={`status-badge status-badge--${type}`}>{children}</span>;
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
    const [kpis, setKpis] = useState({
        pendingOrders: 0,
        awaitingShipment: 0,
        lowStock: 0,
        todayRevenue: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeAITab, setActiveAITab] = useState("copilot"); // copilot, recommendations, report
    const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

    // Sync-banner
    const [staleBanner, setStaleBanner] = useState(false);
    const [applyingSyncData, setApplyingSyncData] = useState(false);
    const freshSnapshotRef = useRef(null);

    const { user } = useAuth();

    // ─── Apply a snapshot to all state slices ────────────────────────────────

<<<<<<< HEAD
        try {
            const [ordersRes, productsRes, transRes] = await Promise.all([
                supabase
                    .from("orders")
                    .select("id, customer_name, ig_username, product_name, price, quantity, payment_status, delivery_status, order_date")
                    .eq("user_id", user.id)
                    .order("order_date", { ascending: false }),
                supabase.from("products").select("id, name, stock, reorder_level, price").eq("user_id", user.id),
                supabase.from("transactions").select("amount, type, created_at, status").eq("user_id", user.id),
            ]);

            const transactions = transRes.data || [];
            const orders = ordersRes.data || [];
            const products = productsRes.data || [];

            const pendingOrders = orders.filter((o) => o.payment_status === "unpaid").length;
            const awaitingShipment = orders.filter(
                (o) => o.payment_status === "paid" && o.delivery_status === "pending"
            ).length;
            const lowStockItems = products.filter((p) => {
                const reorder = Number(p.reorder_level ?? 2);
                return Number(p.stock ?? 0) <= reorder;
            });

            const today = new Date().toISOString().split("T")[0];
            const todayRevenue = transactions
                .filter(
                    (t) =>
                        t.status === "success" &&
                        (t.type === "sale" || t.type === "credit") &&
                        t.created_at?.split("T")[0] === today
                )
                .reduce((acc, t) => acc + (t.amount || 0), 0);

            setKpis({
                pendingOrders,
                awaitingShipment,
                lowStock: lowStockItems.length,
                todayRevenue,
            });

            const dayKeys = getLast7Days();
            const salesByDay = Object.fromEntries(dayKeys.map((d) => [d, 0]));
            transactions.forEach((t) => {
                if (t.status === "success" && (t.type === "sale" || t.type === "credit") && t.created_at) {
                    const day = t.created_at.split("T")[0];
                    if (day in salesByDay) salesByDay[day] += t.amount || 0;
                }
            });
            setChartData(dayKeys.map((date) => ({ date, amount: salesByDay[date] })));

            setRecentOrders(orders.slice(0, 8));
            setLowStockProducts(lowStockItems.slice(0, 6));

            const nextInsights = [];
            if (pendingOrders > 0) {
                nextInsights.push({
                    message: `${pendingOrders} order${pendingOrders > 1 ? "s" : ""} awaiting payment.`,
                    link: "/orders",
                    linkLabel: "Review orders",
                });
            }
            if (awaitingShipment > 0) {
                nextInsights.push({
                    message: `${awaitingShipment} paid order${awaitingShipment > 1 ? "s" : ""} need to be shipped.`,
                    link: "/orders",
                    linkLabel: "Ship now",
                });
            }
            if (lowStockItems.length > 0) {
                nextInsights.push({
                    message: `${lowStockItems.length} product${lowStockItems.length > 1 ? "s" : ""} running low on stock.`,
                    link: "/products",
                    linkLabel: "Restock",
                });
            }
            setInsights(nextInsights);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const handler = () => {
            setLoading(true);
            fetchStats();
        };
        window.addEventListener("sellersync-data-changed", handler);
        return () => window.removeEventListener("sellersync-data-changed", handler);
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const demoKpis = { pendingOrders: 5, awaitingShipment: 8, lowStock: 3, todayRevenue: 14200 };
    const demoOrders = [
        { id: 1, customer_name: "Aarika Shah", ig_username: "@aarika.style", product_name: "Silk Scarf", price: 2400, payment_status: "paid", delivery_status: "pending", order_date: new Date(Date.now() - 3600000 * 2).toISOString() },
        { id: 2, customer_name: "Mina Rao", ig_username: "@mina.closet", product_name: "Linen Set", price: 3800, payment_status: "unpaid", delivery_status: "pending", order_date: new Date(Date.now() - 3600000 * 48).toISOString() },
        { id: 3, customer_name: "Tara Iyer", ig_username: "@tara.jewels", product_name: "Gold Hoops", price: 1200, payment_status: "paid", delivery_status: "shipped", order_date: new Date(Date.now() - 3600000 * 72).toISOString() },
        { id: 4, customer_name: "Priya Nair", ig_username: "@priya.bags", product_name: "Tote Bag", price: 3200, payment_status: "paid", delivery_status: "pending", order_date: new Date(Date.now() - 3600000 * 5).toISOString() },
        { id: 5, customer_name: "Sana Khan", ig_username: "@sana.fashion", product_name: "Cotton Dress", price: 2800, payment_status: "unpaid", delivery_status: "pending", order_date: new Date(Date.now() - 3600000 * 120).toISOString() },
    ];
    const demoLowStock = [
        { id: 1, name: "Gold Hoops", stock: 2, reorder_level: 5, price: 1200 },
        { id: 2, name: "Silk Scarf", stock: 1, reorder_level: 3, price: 2400 },
        { id: 3, name: "Tote Bag", stock: 3, reorder_level: 5, price: 3200 },
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
    ];
    const demoChartData = getLast7Days().map((date, i) => ({
        date,
        amount: [7800, 9400, 8600, 10200, 9400, 10800, 11200][i],
    }));

    const displayKpis = demoMode && !loading && kpis.pendingOrders === 0 && kpis.awaitingShipment === 0 ? demoKpis : kpis;
    const displayOrders = demoMode && !loading && recentOrders.length === 0 ? demoOrders : recentOrders;
    const displayLowStock = demoMode && !loading && lowStockProducts.length === 0 ? demoLowStock : lowStockProducts;
    const chartDataToRender =
        demoMode && !loading && chartData.every((d) => d.amount === 0) ? demoChartData : chartData;

<<<<<<< HEAD
    const chartMax = useMemo(() => Math.max(...chartDataToRender.map((d) => d.amount), 1), [chartDataToRender]);

    const todayFormatted = new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    const getOrderStatus = (order) => {
        if (order.payment_status === "unpaid") return { label: "Awaiting payment", type: "pending" };
        if (order.delivery_status === "pending") return { label: "Ready to ship", type: "paid" };
        if (order.delivery_status === "shipped") return { label: "Shipped", type: "shipped" };
        return { label: order.delivery_status, type: "pending" };
    };

    // Filter Priority Orders (Unpaid or Paid-but-unshipped)
    const priorityOrders = useMemo(() => {
        const list = displayOrders.filter(o => o.payment_status === "unpaid" || (o.payment_status === "paid" && o.delivery_status === "pending"));
        // Sort: unpaid for longer, paid-unshipped for longer
        return list.sort((a, b) => new Date(a.order_date) - new Date(b.order_date)).slice(0, 5);
    }, [displayOrders]);

    // Calculate urgency label
    const getUrgency = (order) => {
        const hours = (Date.now() - new Date(order.order_date).getTime()) / 3600000;
        if (order.payment_status === "unpaid") {
            if (hours > 72) return { label: "Overdue Follow-up", type: "low" }; // maps to error red
            return { label: "Awaiting DM Reply", type: "pending" }; // maps to warning gold
        } else {
            if (hours > 24) return { label: "Shipment Overdue", type: "low" }; // maps to error red
            return { label: "Pack & Label", type: "paid" }; // maps to success green
        }
    };

    // Custom SVG Revenue Chart Renderer
    const renderSVGChart = () => {
        const height = 180;
        const width = 500;
        const paddingLeft = 45;
        const paddingRight = 15;
        const paddingTop = 20;
        const paddingBottom = 30;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        
        const yTicks = [0, Math.round(chartMax / 2), chartMax];
        
        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="revenue-svg-chart" style={{ width: "100%", height: "auto", display: "block" }}>
                {/* Horizontal Grid Lines */}
                {yTicks.map((tick, i) => {
                    const y = paddingTop + chartHeight - (tick / chartMax) * chartHeight;
                    return (
                        <g key={i}>
                            <line 
                                x1={paddingLeft} 
                                y1={y} 
                                x2={width - paddingRight} 
                                y2={y} 
                                stroke="var(--border-subtle)" 
                                strokeWidth={1}
                                strokeDasharray={i === 0 ? "none" : "4 4"}
                            />
                            <text 
                                x={paddingLeft - 8} 
                                y={y + 3} 
                                textAnchor="end" 
                                fill="var(--text-muted)" 
                                fontSize={9} 
                                fontFamily="var(--font-mono)"
                                fontWeight="500"
                            >
                                Rs {tick > 999 ? `${(tick / 1000).toFixed(0)}k` : tick}
                            </text>
                        </g>
                    );
                })}
                
                {/* Columns */}
                {chartDataToRender.map((day, i) => {
                    const barWidth = (chartWidth / chartDataToRender.length) * 0.55;
                    const spacing = (chartWidth / chartDataToRender.length);
                    const x = paddingLeft + i * spacing + (spacing - barWidth) / 2;
                    const barHeight = (day.amount / chartMax) * chartHeight;
                    const y = paddingTop + chartHeight - barHeight;
                    const isPeak = day.amount === chartMax && day.amount > 0;
                    
                    return (
                        <g key={day.date}>
                            <rect 
                                x={x} 
                                y={y} 
                                width={barWidth} 
                                height={Math.max(barHeight, 4)} 
                                rx={4} 
                                ry={4}
                                fill={isPeak ? "var(--accent)" : "var(--accent-soft)"}
                                stroke={isPeak ? "var(--accent-hover)" : "rgba(217, 106, 83, 0.15)"}
                                strokeWidth={1}
                                style={{ transition: "all 0.3s ease" }}
                            />
                            <text 
                                x={x + barWidth / 2} 
                                y={paddingTop + chartHeight + 16} 
                                textAnchor="middle" 
                                fill="var(--text-secondary)" 
                                fontSize={9}
                                fontWeight="600"
                            >
                                {formatDayLabel(day.date)}
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    return (
        <div className="page-shell" style={{ padding: "24px 32px 48px" }}>
            {/* Header Briefing */}
            <div className="dashboard-header" style={{ marginBottom: "28px" }}>
                <div>
                    <h1 className="h1" style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>Store Heartbeat</h1>
                    <p className="dashboard-header__meta" style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>{todayFormatted}</span>
                    </p>
                </div>
                <div className="dashboard-header__actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <Link to="/orders">
                        <Button size="sm" style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: "var(--radius-md)" }}>
                            <Plus size={14} /> New order
                        </Button>
                    </Link>
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
                    <NotificationsBell />
                </div>
            </div>

<<<<<<< HEAD
            {/* Insights Warnings */}
            <AnimatePresence>
                {!loading && insights.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}
                    >
                        {insights.map((item, i) => (
                            <div key={i} className="insight-banner insight-banner--warning" style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--radius-md)" }}>
                                <AlertTriangle size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
                                <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "500" }}>{item.message} </span>
                                    <Link to={item.link} style={{ color: "var(--accent)", fontWeight: "600", fontSize: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}>
                                        {item.linkLabel} <ArrowRight size={12} />
                                    </Link>
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Daily Briefing Console Card */}
            <div style={{ 
                background: "var(--surface)", 
                border: "1px solid var(--border)", 
                borderRadius: "var(--radius-lg)", 
                padding: "20px", 
                marginBottom: "24px", 
                boxShadow: "var(--shadow-sm)" 
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <Activity size={16} color="var(--accent)" />
                    <h2 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Morning Briefing</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    {/* Awaiting Shipment */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--surface-raised)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ width: "36px", height: "36px", background: "var(--accent-soft)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
                            <Truck size={18} />
                        </div>
                        <div>
                            <div className="caption" style={{ color: "var(--text-muted)" }}>To Ship</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", display: "flex", gap: "6px", alignItems: "baseline", marginTop: "2px" }}>
                                <CountUp end={displayKpis.awaitingShipment} />
                                <span style={{ fontSize: "11px", fontWeight: "600", color: displayKpis.awaitingShipment > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                                    {displayKpis.awaitingShipment > 0 ? "Needs packing" : "Complete"}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Awaiting Payment */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--surface-raised)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ width: "36px", height: "36px", background: "var(--warning-soft)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--warning)", flexShrink: 0 }}>
                            <Clock size={18} />
                        </div>
                        <div>
                            <div className="caption" style={{ color: "var(--text-muted)" }}>Awaiting Payment</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", display: "flex", gap: "6px", alignItems: "baseline", marginTop: "2px" }}>
                                <CountUp end={displayKpis.pendingOrders} />
                                <span style={{ fontSize: "11px", fontWeight: "600", color: displayKpis.pendingOrders > 0 ? "var(--warning)" : "var(--text-muted)" }}>
                                    {displayKpis.pendingOrders > 0 ? "Check DMs" : "All paid"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Low Stock Alerts */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--surface-raised)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ width: "36px", height: "36px", background: "var(--error-soft)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error)", flexShrink: 0 }}>
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <div className="caption" style={{ color: "var(--text-muted)" }}>Low Stock Warnings</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", display: "flex", gap: "6px", alignItems: "baseline", marginTop: "2px" }}>
                                <CountUp end={displayKpis.lowStock} />
                                <span style={{ fontSize: "11px", fontWeight: "600", color: displayKpis.lowStock > 0 ? "var(--error)" : "var(--text-muted)" }}>
                                    {displayKpis.lowStock > 0 ? "Restock soon" : "Healthy"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Today's Sales */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--surface-raised)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ width: "36px", height: "36px", background: "var(--success-soft)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)", flexShrink: 0 }}>
                            <TrendingUp size={18} />
                        </div>
                        <div>
                            <div className="caption" style={{ color: "var(--text-muted)" }}>Today's Revenue</div>
                            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--success)", marginTop: "2px" }}>
                                Rs <CountUp end={displayKpis.todayRevenue} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Action Grids */}
            <div className="dashboard-grid" style={{ marginBottom: "24px" }}>
                {/* Priority queue panel */}
                <div className="panel-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                    <div className="panel-header" style={{ marginBottom: "14px" }}>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Fulfillment Priority Queue</h3>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>Items requiring direct message response or package packaging.</p>
                        </div>
                        <Link to="/orders" style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent)", textDecoration: "none" }}>Open Workspace →</Link>
                    </div>

                    {loading ? (
                        <div className="skeleton" style={{ height: "200px" }} />
                    ) : priorityOrders.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <ShoppingBag size={24} style={{ marginBottom: "8px", opacity: 0.4 }} />
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: "500" }}>All orders are processed!</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto", flex: 1 }}>
                            <table className="data-table" style={{ borderCollapse: "separate", borderSpacing: "0 4px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: "8px 10px" }}>Customer</th>
                                        <th style={{ padding: "8px 10px" }}>Item</th>
                                        <th style={{ padding: "8px 10px" }}>Action Status</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Process</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priorityOrders.map((order) => {
                                        const urgency = getUrgency(order);
                                        return (
                                            <tr key={order.id} className="table-row-hover" style={{ background: "var(--surface-raised)", transition: "background 0.2s ease" }}>
                                                <td style={{ padding: "10px", borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)", borderLeft: `3px solid var(--${urgency.type === "low" ? "error" : urgency.type === "pending" ? "warning" : "success"})` }}>
                                                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{order.customer_name}</div>
                                                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{order.ig_username || "—"}</div>
                                                </td>
                                                <td style={{ padding: "10px", fontSize: "13px", fontWeight: "500" }}>{order.product_name}</td>
                                                <td style={{ padding: "10px" }}>
                                                    <StatusBadge type={urgency.type}>
                                                        {urgency.label}
                                                    </StatusBadge>
                                                </td>
                                                <td style={{ padding: "10px", textAlign: "right", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}>
                                                    <Link to="/orders">
                                                        <Button size="sm" variant="ghost" style={{ padding: "4px 8px", fontSize: "11px", color: "var(--accent)" }}>
                                                            Sync <ArrowRight size={11} />
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Low stock alerts panel */}
                <div className="panel-card" style={{ padding: "20px" }}>
                    <div className="panel-header" style={{ marginBottom: "14px" }}>
                        <div>
                            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Restock Monitor</h3>
                            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>Items running low. Click to adjust stock values.</p>
                        </div>
                        <Link to="/products" style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent)", textDecoration: "none" }}>Inventory Manager →</Link>
                    </div>

                    {loading ? (
                        <div className="skeleton" style={{ height: "160px" }} />
                    ) : displayLowStock.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--text-muted)" }}>
                            <Package size={22} style={{ marginBottom: "8px", opacity: 0.4 }} />
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: "500" }}>All items are well stocked.</p>
                        </div>
                    ) : (
                        <table className="data-table" style={{ borderCollapse: "separate", borderSpacing: "0 4px" }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: "8px 10px" }}>Product</th>
                                    <th style={{ padding: "8px 10px" }}>In Stock</th>
                                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayLowStock.map((product) => (
                                    <tr key={product.id} className="table-row-hover" style={{ background: "var(--surface-raised)", transition: "background 0.2s ease" }}>
                                        <td style={{ padding: "10px", fontWeight: "600", fontSize: "13px", borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)" }}>{product.name}</td>
                                        <td style={{ padding: "10px" }}>
                                            <span className="mono" style={{ fontWeight: "700", color: product.stock === 0 ? "var(--error)" : "var(--warning)" }}>
                                                {product.stock} units
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px", textAlign: "right", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}>
                                            <StatusBadge type={product.stock === 0 ? "low" : "pending"}>
                                                {product.stock === 0 ? "Out of Stock" : "Low Stock"}
                                            </StatusBadge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Chart and Quick Actions */}
            <div className="dashboard-secondary" style={{ marginBottom: "28px" }}>
                <div className="panel-card" style={{ padding: "20px" }}>
                    <div className="panel-header" style={{ marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>7-Day Revenue Trend</h3>
                    </div>
                    {loading ? (
                        <div className="skeleton" style={{ height: "160px" }} />
                    ) : (
                        renderSVGChart()
                    )}
                </div>

                <div className="panel-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                    <div className="panel-header" style={{ marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Fulfillment Toolkit</h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, justifyContent: "center" }}>
                        <Link to="/orders" style={{ textDecoration: "none" }}>
                            <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start", padding: "10px 14px", borderRadius: "var(--radius-md)" }}>
                                <ShoppingBag size={15} color="var(--accent)" />
                                <span style={{ fontWeight: "600" }}>Orders Workspace</span>
                            </Button>
                        </Link>
                        <Link to="/products" style={{ textDecoration: "none" }}>
                            <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start", padding: "10px 14px", borderRadius: "var(--radius-md)" }}>
                                <Package size={15} color="var(--accent)" />
                                <span style={{ fontWeight: "600" }}>Manage Inventory</span>
                            </Button>
                        </Link>
                        <Link to="/transactions" style={{ textDecoration: "none" }}>
                            <Button variant="secondary" style={{ width: "100%", justifyContent: "flex-start", padding: "10px 14px", borderRadius: "var(--radius-md)" }}>
                                <TrendingUp size={15} color="var(--accent)" />
                                <span style={{ fontWeight: "600" }}>Cashflow Ledger</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* AI Assistant Console Container */}
            <div className="dashboard-ai-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <div className="dashboard-ai-section__label" style={{ margin: 0, fontSize: "12px", fontWeight: "700" }}>AI Assistant Workspace</div>
                    <div style={{ display: "flex", gap: "4px", background: "var(--bg-secondary)", padding: "3px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                        {[
                            { id: "copilot", label: "Inventory Co-pilot", icon: Brain },
                            { id: "recommendations", label: "Restock Planner", icon: Sparkles },
                            { id: "report", label: "Business Analyst", icon: Activity }
                        ].map(tab => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveAITab(tab.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "6px 12px",
                                        borderRadius: "var(--radius-sm)",
                                        border: "none",
                                        background: activeAITab === tab.id ? "var(--bg-surface)" : "transparent",
                                        color: activeAITab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                                        fontWeight: "750",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        boxShadow: activeAITab === tab.id ? "var(--shadow-sm)" : "none",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <TabIcon size={12} color={activeAITab === tab.id ? "var(--accent)" : "var(--text-muted)"} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                {/* ai-workspace-panel class wrapper prevents flattening from resetting the outer border/shadow */}
                <div className="panel-card ai-workspace-panel" style={{ padding: "24px" }}>
                    {activeAITab === "copilot" && <AIInventoryCopilot />}
                    {activeAITab === "recommendations" && <AIRecommendations />}
                    {activeAITab === "report" && <AIBusinessReportWidget />}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
