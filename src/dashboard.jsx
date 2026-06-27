import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
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
import AIRecommendations from "./components/AIRecommendations";
import AIInventoryCopilot from "./components/AIInventoryCopilot";
import AIBusinessReportWidget from "./components/AIBusinessReport";
import NotificationsBell from "./components/NotificationsBell";

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

    const { user } = useAuth();

    const fetchStats = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

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
                    <NotificationsBell />
                </div>
            </div>

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
