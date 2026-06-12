import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, springConfig } from "./components/UI";
import { motion } from "framer-motion";
import { ShoppingBag, AlertTriangle, Package, TrendingUp } from "lucide-react";
import AIRecommendations from "./components/AIRecommendations";
import AIInventoryCopilot from "./components/AIInventoryCopilot";

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
        sales[name] = (sales[name] || 0) + (Number(o.price) || 0);
    });
    return Object.entries(sales)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
}

const Dashboard = () => {
    const [stats, setStats] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();

    const fetchStats = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const [ordersRes, productsRes, transRes] = await Promise.all([
                    supabase.from("orders").select("id, customer_name, product_name, price, payment_status, delivery_status, order_date").eq("user_id", user.id).order("order_date", { ascending: false }),
                    supabase.from("products").select("id, name, stock").eq("user_id", user.id),
                    supabase.from("transactions").select("amount, type, created_at").eq("user_id", user.id)
                ]);

                const transactions = transRes.data || [];
                const orders = ordersRes.data || [];
                const products = productsRes.data || [];

                const revenue = transactions.reduce(
                    (acc, t) => (t.type === "sale" || t.type === "credit" ? acc + (t.amount || 0) : acc - (t.amount || 0)),
                    0
                );
                const ordersCount = orders.length;
                const productsCount = products.length;
                const pendingCount = orders.filter((o) => o.delivery_status === "pending").length;
                const unpaidCount = orders.filter((o) => o.payment_status === "unpaid").length;
                const lowStock = products.filter((p) => {
                    const reorder = Number(p.reorder_level ?? 2);
                    return Number(p.stock ?? 0) <= reorder;
                });

                setStats([
                    { label: "Revenue", value: revenue, prefix: "Rs " },
                    { label: "Orders", value: ordersCount },
                    { label: "Products", value: productsCount },
                    { label: "Pending", value: pendingCount },
                ]);

                const dayKeys = getLast7Days();
                const salesByDay = Object.fromEntries(dayKeys.map((d) => [d, 0]));
                transactions.forEach((t) => {
                    if ((t.type === "sale" || t.type === "credit") && t.created_at) {
                        const day = t.created_at.split("T")[0];
                        if (day in salesByDay) salesByDay[day] += t.amount || 0;
                    }
                });
                setChartData(dayKeys.map((date) => ({ date, amount: salesByDay[date] })));

                setRecentActivity(
                    orders.slice(0, 6).map((o) => ({
                        id: o.id,
                        type: "order",
                        title: o.customer_name,
                        subtitle: o.product_name || "Order",
                        date: o.order_date,
                        meta: `${o.payment_status} · ${o.delivery_status}`,
                        amount: o.price,
                    }))
                );

                setTopProducts(getTopProducts(orders));

                const nextInsights = [];
                if (unpaidCount > 0) {
                    nextInsights.push({
                        type: "warning",
                        message: `${unpaidCount} order${unpaidCount > 1 ? "s" : ""} awaiting payment.`,
                        link: "/orders",
                        linkLabel: "Review orders",
                    });
                }
                if (lowStock.length > 0) {
                    nextInsights.push({
                        type: "warning",
                        message: `${lowStock.length} product${lowStock.length > 1 ? "s" : ""} low on stock.`,
                        link: "/products",
                        linkLabel: "Update inventory",
                    });
                }
                setInsights(nextInsights);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
    };

    // Initial fetch and subscribe to global data-change events so dashboard updates immediately
    useEffect(() => {
        fetchStats();
        const handler = () => {
            setLoading(true);
            fetchStats();
        };
        window.addEventListener('sellersync-data-changed', handler);
        return () => window.removeEventListener('sellersync-data-changed', handler);
    }, [user]);

    const chartMax = useMemo(
        () => Math.max(...chartData.map((d) => d.amount), 1),
        [chartData]
    );

    const topMax = useMemo(
        () => Math.max(...topProducts.map((p) => p.revenue), 1),
        [topProducts]
    );

    return (
        <div className="page-shell">
            <header style={{ marginBottom: "40px" }}>
                <h1 className="h1">Dashboard</h1>
                <p className="subheading" style={{ marginTop: "8px" }}>Your business performance at a glance.</p>
            </header>

            <div style={{ marginBottom: '20px' }}>
                <AIInventoryCopilot />
            </div>

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
                            {s.prefix}{typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

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
                    ) : chartData.every((d) => d.amount === 0) ? (
                        <div className="body" style={{ color: "var(--text-muted)", textAlign: "center", padding: "48px 16px", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)" }}>
                            No sales recorded in the last 7 days.
                        </div>
                    ) : (
                        <div>
                            <div style={{ height: "200px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-end", gap: "10px" }}>
                                {chartData.map((day, i) => {
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
                                {chartData.map((day) => (
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
                    ) : topProducts.length === 0 ? (
                        <p className="body" style={{ color: "var(--text-muted)", fontSize: "13px" }}>No product sales yet.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {topProducts.map((p) => (
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
                        {recentActivity.map((item) => (
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
