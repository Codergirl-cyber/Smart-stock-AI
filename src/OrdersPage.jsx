import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, Button, Input } from "./components/UI";
import SyncBanner from "./components/SyncBanner";
import { Search, Plus, ShoppingBag, AtSign, AlertCircle, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./hooks/useToast";
import {
  readOrdersCache,
  writeOrdersCache,
  touchOrdersCache,
  ordersAreEqual,
} from "./services/ordersCache";
import { appendTxnToCache } from "./services/transactionsCache";
import { updateProductInCache } from "./services/productsCache";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyCustomer = {
    customer_name: "",
    ig_username: "",
    payment_status: "unpaid",
    delivery_status: "pending",
    order_date: new Date().toISOString().split("T")[0],
};

const emptyLineItem = { productId: "", quantity: 1, price: "" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState("all");
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [products, setProducts] = useState([]);

    // Multi-product form state
    const [customerInfo, setCustomerInfo] = useState(emptyCustomer);
    const [lineItems, setLineItems] = useState([{ ...emptyLineItem }]);

    // Sync-banner state
    const [staleBanner, setStaleBanner] = useState(false);
    const [applyingSyncData, setApplyingSyncData] = useState(false);
    const freshOrdersRef = useRef([]);

    // ─── Cache-first load ────────────────────────────────────────────────────

    const loadFromCache = useCallback(() => {
        if (!user) return false;
        const cached = readOrdersCache(user.id);
        if (cached) { setOrders(cached.orders); setLoading(false); return true; }
        return false;
    }, [user]);

    const syncFromDB = useCallback(async (force = false) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("user_id", user.id)
                .order("order_date", { ascending: false });

            if (error) throw error;
            const fresh = data || [];

            if (force) {
                setOrders(fresh);
                writeOrdersCache(user.id, fresh);
                setStaleBanner(false);
                return;
            }

            const cached = readOrdersCache(user.id);
            if (cached && ordersAreEqual(cached.orders, fresh)) {
                touchOrdersCache(user.id);
            } else if (!cached) {
                setOrders(fresh);
                writeOrdersCache(user.id, fresh);
            } else {
                freshOrdersRef.current = fresh;
                setStaleBanner(true);
            }
        } catch (err) {
            console.warn("[OrdersPage] Background sync failed:", err.message);
        }
    }, [user]);

    const handleApplySync = useCallback(async () => {
        setApplyingSyncData(true);
        if (freshOrdersRef.current.length > 0) {
            setOrders(freshOrdersRef.current);
            writeOrdersCache(user.id, freshOrdersRef.current);
            freshOrdersRef.current = [];
            setStaleBanner(false);
            setApplyingSyncData(false);
        } else {
            await syncFromDB(true);
            setApplyingSyncData(false);
        }
    }, [user, syncFromDB]);

    // ─── Products fetch ──────────────────────────────────────────────────────

    const fetchProducts = useCallback(async () => {
        if (!user) { setProducts([]); return; }
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("user_id", user.id)
            .order("name", { ascending: true });
        if (error) { console.error("Products error:", error); return; }
        setProducts(data || []);
    }, [user]);

    // ─── Mount effect ────────────────────────────────────────────────────────

    useEffect(() => {
        if (!user) return;
        const cacheHit = loadFromCache();
        if (!cacheHit) {
            setLoading(true);
            syncFromDB(true).finally(() => setLoading(false));
        } else {
            syncFromDB(false);
        }
        fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // ─── Line item helpers ───────────────────────────────────────────────────

    const addLineItem = () => setLineItems(prev => [...prev, { ...emptyLineItem }]);

    const removeLineItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));

    const updateLineItem = (idx, field, value) =>
        setLineItems(prev => prev.map((item, i) => i !== idx ? item : { ...item, [field]: value }));

    /** When product changes, auto-fill price from the product catalogue */
    const handleLineItemProduct = (idx, productId) => {
        const product = products.find(p => p.id === productId);
        setLineItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            return {
                ...item,
                productId,
                // Auto-fill price only if the field is blank or was previously auto-filled
                price: product ? String(product.price) : item.price,
            };
        }));
    };

    // ─── Create orders (batch, one per line item) ────────────────────────────

    const createOrder = async (e) => {
        e.preventDefault();

        if (!customerInfo.customer_name.trim()) {
            showToast("Customer name is required.", "error");
            return;
        }

        const validItems = lineItems.filter(
            item => item.productId && Number(item.quantity) >= 1 && Number(item.price) > 0
        );
        if (validItems.length === 0) {
            showToast("Add at least one product with a valid quantity and price.", "error");
            return;
        }

        try {
            if (!user) { showToast("Please log in to create orders.", "error"); return; }

            // Build payloads for all line items
            const orderPayloads = validItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    user_id: user.id,
                    customer_name: customerInfo.customer_name,
                    ig_username: customerInfo.ig_username || null,
                    product_id: item.productId,
                    product_name: product?.name ?? null,
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                    payment_status: customerInfo.payment_status,
                    delivery_status: customerInfo.delivery_status,
                    order_date: customerInfo.order_date,
                };
            });

            // Batch-insert all orders in one round-trip
            const { data: insertedOrders, error: ordersError } = await supabase
                .from("orders")
                .insert(orderPayloads)
                .select();

            if (ordersError) throw ordersError;

            // Adjust stock if order is created with delivered status
            if (customerInfo.delivery_status === "delivered") {
                for (const item of validItems) {
                    const productId = item.productId;
                    const qty = Number(item.quantity);
                    if (productId) {
                        const { data: prodData } = await supabase
                            .from("products")
                            .select("*")
                            .eq("id", productId)
                            .single();
                        if (prodData) {
                            const newStock = Math.max(0, (prodData.stock || 0) - qty);
                            const { data: updatedProd } = await supabase
                                .from("products")
                                .update({ stock: newStock })
                                .eq("id", productId)
                                .select()
                                .single();
                            if (updatedProd) {
                                updateProductInCache(user.id, updatedProd);
                            }
                        }
                    }
                }
            }

            // Build + batch-insert one transaction per order
            const txnPayloads = insertedOrders.map(order => ({
                user_id: user.id,
                order_id: order.id,
                type: "sale",
                amount: Number(order.price) * (Number(order.quantity) || 1),
                status: customerInfo.payment_status === "paid" ? "success" : "pending",
                created_at: new Date().toISOString(),
            }));

            const { data: insertedTxns, error: txnError } = await supabase
                .from("transactions")
                .insert(txnPayloads)
                .select();

            if (txnError) {
                console.warn("[OrdersPage] Transaction auto-create failed:", txnError.message);
            } else if (insertedTxns) {
                insertedTxns.forEach(t => appendTxnToCache(user.id, t));
            }

            // ── Optimistic UI: prepend all new orders ────────────────────────
            const newOrderList = [...insertedOrders, ...orders];
            setOrders(newOrderList);
            writeOrdersCache(user.id, newOrderList);

            setShowForm(false);
            const n = insertedOrders.length;
            showToast(`${n} order${n > 1 ? "s" : ""} created successfully.`, "success");

            // Reset form
            setCustomerInfo(emptyCustomer);
            setLineItems([{ ...emptyLineItem }]);
            fetchProducts();
            tryDispatchEvent();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to create order. Check stock and try again.", "error");
        }
    };

    // ─── Update status (optimistic) ──────────────────────────────────────────

    const updateStatus = async (id, field, value) => {
        try {
            if (!user) { showToast("Please log in to update orders", "error"); return; }

            const targetOrder = orders.find(o => o.id === id);
            const prevValue = targetOrder ? targetOrder[field] : null;

            setOrders(prev => {
                const updated = prev.map(o => o.id === id ? { ...o, [field]: value } : o);
                writeOrdersCache(user.id, updated);
                return updated;
            });

            const { error } = await supabase
                .from("orders")
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                // Revert
                setOrders(prev => {
                    const reverted = prev.map(o => o.id === id ? { ...o, [field]: prevValue } : o);
                    writeOrdersCache(user.id, reverted);
                    return reverted;
                });
                throw error;
            }

            showToast("Order updated.", "success");

            // Stock adjustment
            if (field === "delivery_status") {
                const productId = targetOrder?.product_id;
                const quantity = targetOrder?.quantity || 1;
                if (productId) {
                    let stockAdjustment = 0;
                    if (value === "delivered" && prevValue !== "delivered") {
                        stockAdjustment = -quantity;
                    } else if (prevValue === "delivered" && value !== "delivered") {
                        stockAdjustment = quantity;
                    }

                    if (stockAdjustment !== 0) {
                        const { data: prodData, error: prodFetchError } = await supabase
                            .from("products")
                            .select("*")
                            .eq("id", productId)
                            .single();

                        if (!prodFetchError && prodData) {
                            const newStock = Math.max(0, (prodData.stock || 0) + stockAdjustment);
                            const { data: updatedProd, error: prodUpdateError } = await supabase
                                .from("products")
                                .update({ stock: newStock })
                                .eq("id", productId)
                                .select()
                                .single();
                            
                            if (!prodUpdateError && updatedProd) {
                                updateProductInCache(user.id, updatedProd);
                                fetchProducts();
                                tryDispatchEvent();
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to update order.", "error");
        }
    };

    const tryDispatchEvent = () => {
        try { window.dispatchEvent(new Event("sellersync-data-changed")); }
        catch (err) { console.warn("Event dispatch failed", err); }
    };

    const isOld = (dateStr) => {
        const diffDays = Math.ceil(Math.abs(new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
        return diffDays > 3;
    };

    // ─── Derived lists ───────────────────────────────────────────────────────

    const filtered = orders.filter(o => {
        const matchesSearch =
            o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
            o.ig_username?.toLowerCase().includes(search.toLowerCase()) ||
            (o.product_name && o.product_name.toLowerCase().includes(search.toLowerCase()));
        if (filter === "unpaid")  return matchesSearch && o.payment_status === "unpaid";
        if (filter === "pending") return matchesSearch && o.delivery_status === "pending";
        return matchesSearch;
    });

    const customerHistory = selectedCustomer
        ? orders.filter(o => o.customer_name === selectedCustomer)
        : [];

    // ─── Form: computed order total ──────────────────────────────────────────
    const orderTotal = lineItems.reduce(
        (sum, item) => sum + (Number(item.price) * Number(item.quantity) || 0),
        0
    );

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="page-shell">
            <header className="page-header" style={{ marginBottom: "32px" }}>
                <div>
                    <h1 className="h1">Order Tracker</h1>
                    <p className="subheading" style={{ marginTop: "8px" }}>Fast order management for IG sellers.</p>
                </div>
                <Button onClick={() => setShowForm(true)} style={{ background: "var(--accent)", color: "white" }}>
                    <Plus size={16} />
                    New Order
                </Button>
            </header>

            {/* Sync Banner */}
            <SyncBanner
                visible={staleBanner}
                syncing={applyingSyncData}
                message="New data is available from the database — your view may be outdated."
                onApply={handleApplySync}
                onDismiss={() => setStaleBanner(false)}
            />

            {/* Search + Filters */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "center", flexWrap: "wrap" }}>
                <div className="premium-search" style={{ flex: 1, minWidth: "200px", margin: 0 }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input
                        placeholder="Search name, IG, or product..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: "transparent", border: "none", color: "var(--text-primary)", outline: "none", fontSize: "14px", flex: 1 }}
                    />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    {[
                        { id: "all",     label: "All" },
                        { id: "unpaid",  label: "Unpaid",          active: "rgba(239,68,68,0.1)",   color: "var(--error)" },
                        { id: "pending", label: "Pending Delivery", active: "rgba(234,179,8,0.1)",  color: "var(--warning)" },
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setFilter(btn.id)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: filter === btn.id ? (btn.active || "var(--accent-soft)") : "var(--surface)",
                                color: filter === btn.id ? (btn.color || "var(--accent)") : "var(--text-secondary)",
                                fontSize: "13px", fontWeight: "600", cursor: "pointer",
                            }}
                        >{btn.label}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div>
                    <Skeleton height="40px" className="mb-8" />
                    {Array(6).fill(0).map((_, i) => <Skeleton key={i} height="60px" className="mb-2" />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
                    <h3 className="h2">No orders tracked yet</h3>
                    <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
                        Start adding your Instagram orders to keep track of payments and deliveries.
                    </p>
                    <Button onClick={() => setShowForm(true)}><Plus size={16} />Add Your First Order</Button>
                </div>
            ) : (
                <div className="table-shell" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                                <th className="caption" style={{ padding: "16px" }}>Customer / IG</th>
                                <th className="caption" style={{ padding: "16px" }}>Product</th>
                                <th className="caption" style={{ padding: "16px" }}>Qty</th>
                                <th className="caption" style={{ padding: "16px" }}>Price</th>
                                <th className="caption" style={{ padding: "16px" }}>Payment</th>
                                <th className="caption" style={{ padding: "16px" }}>Delivery</th>
                                <th className="caption" style={{ padding: "16px" }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((order) => {
                                const needsAttention = isOld(order.order_date) && order.delivery_status !== "delivered";
                                return (
                                    <tr
                                        key={order.id}
                                        style={{
                                            borderBottom: "1px solid var(--border-subtle)",
                                            background: needsAttention ? "rgba(239,68,68,0.03)" : "transparent",
                                            transition: "background 0.2s ease",
                                        }}
                                    >
                                        <td style={{ padding: "16px" }}>
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                                <button
                                                    onClick={() => setSelectedCustomer(order.customer_name)}
                                                    style={{ background: "none", border: "none", padding: 0, textAlign: "left", color: "var(--accent)", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
                                                >
                                                    {order.customer_name}
                                                </button>
                                                <span style={{ color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                                                    <AtSign size={10} /> {order.ig_username || "N/A"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="body" style={{ padding: "16px", fontSize: "14px" }}>{order.product_name}</td>
                                        <td className="mono" style={{ padding: "16px", fontWeight: "600" }}>{order.quantity || 1}</td>
                                        <td className="mono" style={{ padding: "16px", fontWeight: "600" }}>Rs {order.price}</td>
                                        <td style={{ padding: "16px" }}>
                                            <select
                                                value={order.payment_status}
                                                onChange={(e) => updateStatus(order.id, "payment_status", e.target.value)}
                                                style={{
                                                    padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                                                    border: "1px solid var(--border)",
                                                    background: order.payment_status === "paid" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                                    color: order.payment_status === "paid" ? "var(--success)" : "var(--error)",
                                                }}
                                            >
                                                <option value="unpaid">Unpaid</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "16px" }}>
                                            <select
                                                value={order.delivery_status}
                                                onChange={(e) => updateStatus(order.id, "delivery_status", e.target.value)}
                                                style={{
                                                    padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600",
                                                    border: "1px solid var(--border)",
                                                    background: order.delivery_status === "delivered" ? "rgba(34,197,94,0.1)" : order.delivery_status === "shipped" ? "rgba(59,130,246,0.1)" : "rgba(234,179,8,0.1)",
                                                    color: order.delivery_status === "delivered" ? "var(--success)" : order.delivery_status === "shipped" ? "#3b82f6" : "var(--warning)",
                                                }}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: "16px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span className="body" style={{ fontSize: "13px", color: needsAttention ? "var(--error)" : "var(--text-secondary)" }}>
                                                    {new Date(order.order_date).toLocaleDateString()}
                                                </span>
                                                {needsAttention && <AlertCircle size={14} color="var(--error)" title="Needs update (3+ days old)" />}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── New Order Drawer ────────────────────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowForm(false)}
                            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            style={{
                                position: "relative", width: "520px", maxWidth: "100%", height: "100%",
                                background: "var(--surface)", boxShadow: "-10px 0 30px rgba(0,0,0,0.12)",
                                padding: "40px", display: "flex", flexDirection: "column",
                                borderLeft: "1px solid var(--border)",
                            }}
                        >
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
                                <div>
                                    <h2 className="h2">New Order</h2>
                                    <p className="caption" style={{ color: "var(--text-muted)", marginTop: "4px" }}>
                                        Add multiple products to one order
                                    </p>
                                </div>
                                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={createOrder} style={{ display: "flex", flexDirection: "column", gap: "0", flex: 1, overflowY: "auto" }}>

                                {/* ── Customer Info ─────────────────────────── */}
                                <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--border-subtle)" }}>
                                    <p className="caption" style={{ color: "var(--text-muted)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>Customer</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                        <Input
                                            label="Customer Name *"
                                            placeholder="e.g. Aisha Khan"
                                            value={customerInfo.customer_name}
                                            onChange={e => setCustomerInfo(p => ({ ...p, customer_name: e.target.value }))}
                                            required
                                        />
                                        <Input
                                            label="Instagram Username"
                                            placeholder="@username"
                                            value={customerInfo.ig_username}
                                            onChange={e => setCustomerInfo(p => ({ ...p, ig_username: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* ── Line Items ───────────────────────────── */}
                                <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--border-subtle)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                                        <p className="caption" style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>
                                            Products
                                        </p>
                                        <button
                                            type="button"
                                            onClick={addLineItem}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "5px",
                                                background: "var(--accent-soft)", border: "none",
                                                color: "var(--accent)", fontSize: "12px", fontWeight: "600",
                                                padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                                            }}
                                        >
                                            <Plus size={12} /> Add Product
                                        </button>
                                    </div>

                                    {/* Column headers */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 28px", gap: "8px", marginBottom: "6px" }}>
                                        <span className="caption" style={{ color: "var(--text-muted)", fontSize: "11px" }}>Product</span>
                                        <span className="caption" style={{ color: "var(--text-muted)", fontSize: "11px" }}>Qty</span>
                                        <span className="caption" style={{ color: "var(--text-muted)", fontSize: "11px" }}>Price (Rs)</span>
                                        <span />
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        {lineItems.map((item, idx) => (
                                            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 80px 28px", gap: "8px", alignItems: "center" }}>
                                                {/* Product selector */}
                                                <select
                                                    value={item.productId}
                                                    onChange={e => handleLineItemProduct(idx, e.target.value)}
                                                    required
                                                    style={{
                                                        width: "100%", padding: "8px 10px", borderRadius: "8px",
                                                        border: "1px solid var(--border)", background: "var(--surface)",
                                                        color: item.productId ? "var(--text-primary)" : "var(--text-muted)",
                                                        fontSize: "13px",
                                                    }}
                                                >
                                                    <option value="">Select…</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.stock} left)
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Quantity */}
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateLineItem(idx, "quantity", e.target.value)}
                                                    required
                                                    style={{
                                                        width: "100%", padding: "8px 6px", borderRadius: "8px",
                                                        border: "1px solid var(--border)", background: "var(--surface)",
                                                        color: "var(--text-primary)", fontSize: "13px", textAlign: "center",
                                                    }}
                                                />

                                                {/* Price — auto-filled from product, but editable */}
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0"
                                                    value={item.price}
                                                    onChange={e => updateLineItem(idx, "price", e.target.value)}
                                                    required
                                                    style={{
                                                        width: "100%", padding: "8px 6px", borderRadius: "8px",
                                                        border: "1px solid var(--border)", background: "var(--surface)",
                                                        color: "var(--text-primary)", fontSize: "13px", textAlign: "right",
                                                    }}
                                                />

                                                {/* Remove row */}
                                                {lineItems.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLineItem(idx)}
                                                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                ) : <span />}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order total */}
                                    {orderTotal > 0 && (
                                        <div style={{
                                            marginTop: "14px", padding: "10px 14px",
                                            background: "var(--accent-soft)", borderRadius: "8px",
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                        }}>
                                            <span className="caption" style={{ color: "var(--accent)" }}>Order Total</span>
                                            <span className="mono" style={{ fontWeight: "700", color: "var(--accent)", fontSize: "15px" }}>
                                                Rs {orderTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* ── Order Meta ───────────────────────────── */}
                                <div style={{ marginBottom: "24px" }}>
                                    <p className="caption" style={{ color: "var(--text-muted)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "11px" }}>Order Details</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                        <div>
                                            <label className="caption" style={{ display: "block", marginBottom: "6px", color: "var(--text-muted)" }}>Payment Status</label>
                                            <select
                                                value={customerInfo.payment_status}
                                                onChange={e => setCustomerInfo(p => ({ ...p, payment_status: e.target.value }))}
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "13px" }}
                                            >
                                                <option value="unpaid">Unpaid</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="caption" style={{ display: "block", marginBottom: "6px", color: "var(--text-muted)" }}>Delivery Status</label>
                                            <select
                                                value={customerInfo.delivery_status}
                                                onChange={e => setCustomerInfo(p => ({ ...p, delivery_status: e.target.value }))}
                                                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "13px" }}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Input
                                        label="Order Date"
                                        type="date"
                                        value={customerInfo.order_date}
                                        onChange={e => setCustomerInfo(p => ({ ...p, order_date: e.target.value }))}
                                    />
                                </div>

                                {/* ── Submit ───────────────────────────────── */}
                                <div style={{ marginTop: "auto", paddingTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                                    <Button type="submit" style={{ background: "var(--accent)", color: "white" }}>
                                        Create Order{lineItems.filter(i => i.productId).length > 1 ? "s" : ""}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Customer History Modal ──────────────────────────────────────── */}
            <AnimatePresence>
                {selectedCustomer && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedCustomer(null)}
                            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ position: "relative", width: "100%", maxWidth: "700px", background: "var(--surface)", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                <div>
                                    <h2 className="h2" style={{ marginBottom: "4px" }}>{selectedCustomer}</h2>
                                    <p className="caption">Customer Order History · {customerHistory.length} order{customerHistory.length !== 1 ? "s" : ""}</p>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
                            </div>

                            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                                {customerHistory.map(o => (
                                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <div>
                                            <div style={{ fontWeight: "600", fontSize: "14px" }}>{o.product_name}</div>
                                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                                {new Date(o.order_date).toLocaleDateString()} · qty {o.quantity || 1}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div className="mono" style={{ fontWeight: "600" }}>Rs {o.price}</div>
                                            <div style={{ fontSize: "11px", color: o.payment_status === "paid" ? "var(--success)" : "var(--error)" }}>
                                                {o.payment_status.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div className="mono" style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                                    Total: Rs {customerHistory.reduce((s, o) => s + Number(o.price || 0), 0).toLocaleString()}
                                </div>
                                <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>Close</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
