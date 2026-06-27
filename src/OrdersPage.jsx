<<<<<<< HEAD
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, Button, Input } from "./components/UI";
import { Search, Plus, ShoppingBag, AtSign, AlertCircle, X, Copy, Check, MessageSquare, Clipboard, ExternalLink, Calendar, Receipt } from "lucide-react";
=======
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, Button, Input } from "./components/UI";
import SyncBanner from "./components/SyncBanner";
import { Search, Plus, ShoppingBag, AtSign, AlertCircle, X, Trash2 } from "lucide-react";
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
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
    const [filter, setFilter] = useState("all"); // all, unpaid, pending
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    const [products, setProducts] = useState([]);
<<<<<<< HEAD
    const [selectedProductId, setSelectedProductId] = useState("");
    
    // Notes stored in LocalStorage for order addresses/notes
    const [orderNotes, setOrderNotes] = useState({});
=======
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3

    // Multi-product form state
    const [customerInfo, setCustomerInfo] = useState(emptyCustomer);
    const [lineItems, setLineItems] = useState([{ ...emptyLineItem }]);

<<<<<<< HEAD
    const fetchOrders = useCallback(async () => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }
=======
    // Sync-banner state
    const [staleBanner, setStaleBanner] = useState(false);
    const [applyingSyncData, setApplyingSyncData] = useState(false);
    const freshOrdersRef = useRef([]);

    // ─── Cache-first load ────────────────────────────────────────────────────
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3

    const loadFromCache = useCallback(() => {
        if (!user) return false;
        const cached = readOrdersCache(user.id);
        if (cached) { setOrders(cached.orders); setLoading(false); return true; }
        return false;
    }, [user]);

    const syncFromDB = useCallback(async (force = false) => {
        if (!user) return;
        try {
<<<<<<< HEAD
            setLoading(true);
=======
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
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

<<<<<<< HEAD
    const fetchProducts = useCallback(async () => {
        if (!user) {
            setProducts([]);
            return;
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
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
<<<<<<< HEAD
        fetchOrders();
        fetchProducts();
    }, [user, fetchOrders, fetchProducts]);
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3

    // Load notes from local storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem("sellersync_order_notes");
            if (saved) setOrderNotes(JSON.parse(saved));
        } catch (e) {
            console.warn(e);
        }
    }, []);

    const saveNote = (orderId, noteText) => {
        const next = { ...orderNotes, [orderId]: noteText };
        setOrderNotes(next);
        try {
            localStorage.setItem("sellersync_order_notes", JSON.stringify(next));
        } catch (e) {
            console.warn(e);
        }
    };

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

<<<<<<< HEAD
            const selectedProduct = products.find((p) => p.id === selectedProductId);
            const productName = selectedProduct?.name ?? null;

            const insertPayload = {
=======
            // Build + batch-insert one transaction per order
            const txnPayloads = insertedOrders.map(order => ({
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
                user_id: user.id,
                order_id: order.id,
                type: "sale",
                amount: Number(order.price) * (Number(order.quantity) || 1),
                status: customerInfo.payment_status === "paid" ? "success" : "pending",
                created_at: new Date().toISOString(),
            }));

<<<<<<< HEAD
            Object.keys(insertPayload).forEach((k) => {
                if (insertPayload[k] === undefined || insertPayload[k] === null) delete insertPayload[k];
            });

            const { data: insertedList, error } = await supabase
                .from("orders")
                .insert(insertPayload)
                .select();
=======
            const { data: insertedTxns, error: txnError } = await supabase
                .from("transactions")
                .insert(txnPayloads)
                .select();

            if (txnError) {
                console.warn("[OrdersPage] Transaction auto-create failed:", txnError.message);
            } else if (insertedTxns) {
                insertedTxns.forEach(t => appendTxnToCache(user.id, t));
            }
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3

            // ── Optimistic UI: prepend all new orders ────────────────────────
            const newOrderList = [...insertedOrders, ...orders];
            setOrders(newOrderList);
            writeOrdersCache(user.id, newOrderList);

<<<<<<< HEAD
            await fetchOrders();
            await fetchProducts();
            setShowForm(false);
            showToast("Order created successfully.", "success");
            
            // Auto select new order
            if (insertedList && insertedList.length > 0) {
                setSelectedOrderId(insertedList[0].id);
            }

            setNewOrder({
                customer_name: "",
                ig_username: "",
                product_name: "",
                quantity: 1,
                price: "",
                payment_status: "unpaid",
                delivery_status: "pending",
                order_date: new Date().toISOString().split('T')[0]
            });
            setSelectedProductId("");
=======
            setShowForm(false);
            const n = insertedOrders.length;
            showToast(`${n} order${n > 1 ? "s" : ""} created successfully.`, "success");

            // Reset form
            setCustomerInfo(emptyCustomer);
            setLineItems([{ ...emptyLineItem }]);
            fetchProducts();
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
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
<<<<<<< HEAD
            tryDispatchEvent();
=======

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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
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

<<<<<<< HEAD
    const filtered = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = 
                (o.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (o.ig_username ?? "").toLowerCase().includes(search.toLowerCase()) ||
                ((o.product_name ?? "") && (o.product_name ?? "").toLowerCase().includes(search.toLowerCase()));
            
            if (filter === "unpaid") return matchesSearch && o.payment_status === "unpaid";
            if (filter === "pending") return matchesSearch && o.delivery_status === "pending";
            return matchesSearch;
        });
    }, [orders, search, filter]);

    // Auto select first order if none selected
    useEffect(() => {
        if (filtered.length > 0 && !selectedOrderId) {
            setSelectedOrderId(filtered[0].id);
        }
    }, [filtered, selectedOrderId]);

    const selectedOrder = useMemo(() => {
        return orders.find(o => o.id === selectedOrderId) || null;
    }, [orders, selectedOrderId]);

    const customerHistory = useMemo(() => {
        if (!selectedOrder) return [];
        return orders.filter(o => o.customer_name === selectedOrder.customer_name && o.id !== selectedOrder.id);
    }, [orders, selectedOrder]);

    const handleCopyText = (text, type = "Template") => {
        navigator.clipboard.writeText(text);
        showToast(`${type} copied to clipboard!`, "success");
    };

    // Pre-built Instagram DM Templates
    const dmTemplates = useMemo(() => {
        if (!selectedOrder) return {};
        const cleanName = selectedOrder.customer_name.split(" ")[0];
        const product = selectedOrder.product_name;
        const total = (Number(selectedOrder.price) * (Number(selectedOrder.quantity) || 1)).toLocaleString();
        
        return {
            paymentPending: `Hi ${cleanName}! Thanks for your order of the ${product}. Total is Rs ${total}. Please share a screenshot of the payment receipt once transferred so we can secure your stock and ship it! ✨`,
            paymentReceived: `Hi ${cleanName}! Payment of Rs ${total} received, thank you! 💖 Your order of ${product} is being packaged and will head out shortly. We'll send you tracking details once shipped!`,
            orderShipped: `Hey ${cleanName}! Good news: your ${product} has been shipped! 🚀 You can track your package details. Let us know when it arrives safely! 📦`
        };
    }, [selectedOrder]);
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3

    // ─── Form: computed order total ──────────────────────────────────────────
    const orderTotal = lineItems.reduce(
        (sum, item) => sum + (Number(item.price) * Number(item.quantity) || 0),
        0
    );

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="page-shell" style={{ padding: "24px 32px 48px" }}>
            <header className="page-header" style={{ marginBottom: "24px" }}>
                <div>
                    <h1 className="h1" style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>Order Tracker Workspace</h1>
                    <p className="subheading" style={{ marginTop: "4px" }}>A high-efficiency command center for Instagram order logistics.</p>
                </div>
                <Button onClick={() => setShowForm(true)} style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: "var(--radius-md)" }}>
                    <Plus size={14} /> New Order
                </Button>
            </header>

<<<<<<< HEAD
            {/* Quick stats / filters row */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
                <div className="premium-search" style={{ flex: 1, minWidth: "240px", margin: 0 }}>
                    <Search size={14} color="var(--text-muted)" />
                    <input 
                        placeholder="Search name, handle, or product..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>
                
                <div style={{ display: "flex", gap: "6px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                    {[
                        { id: "all", label: "All Orders" },
                        { id: "unpaid", label: "Awaiting Payment" },
                        { id: "pending", label: "To Ship" }
                    ].map(btn => (
                        <button 
                            key={btn.id}
                            onClick={() => { setFilter(btn.id); setSelectedOrderId(null); }}
                            style={{ 
                                padding: "6px 12px", 
                                borderRadius: "var(--radius-sm)", 
                                border: "none", 
                                background: filter === btn.id ? "var(--bg-surface)" : "transparent", 
                                color: filter === btn.id ? "var(--text-primary)" : "var(--text-secondary)", 
                                fontSize: "12px", 
                                fontWeight: "600", 
                                cursor: "pointer",
                                boxShadow: filter === btn.id ? "var(--shadow-sm)" : "none",
                                transition: "all 0.15s ease"
                            }}
                        >
                            {btn.label}
                        </button>
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div>
                    <Skeleton height="40px" className="mb-8" />
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} height="70px" className="mb-2" />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
<<<<<<< HEAD
                    <h3 className="h2" style={{ fontSize: "18px", marginBottom: "12px" }}>No orders tracked yet</h3>
                    <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Start adding your Instagram orders to keep track of payments and deliveries.</p>
                    <Button onClick={() => setShowForm(true)}><Plus size={16} />Add Your First Order</Button>
                </div>
            ) : (
                <div className="orders-workspace">
                    
                    {/* LEFT PANEL: Order Queue */}
                    <div className="orders-list-pane">
                        <div className="table-shell" style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 0" }}>
                                <thead>
                                    <tr style={{ textAlign: "left", background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                                        <th className="caption" style={{ padding: "12px 16px" }}>Customer Details</th>
                                        <th className="caption" style={{ padding: "12px 16px" }}>Product SKU</th>
                                        <th className="caption" style={{ padding: "12px 16px" }}>Payment</th>
                                        <th className="caption" style={{ padding: "12px 16px" }}>Shipment</th>
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((order) => {
                                        const needsAttention = isOld(order.order_date) && order.delivery_status !== "delivered";
                                        const isActive = order.id === selectedOrderId;
                                        return (
                                            <tr 
                                                key={order.id} 
                                                onClick={() => setSelectedOrderId(order.id)}
                                                className={`workspace-order-row ${isActive ? "workspace-order-row--active" : ""}`}
                                                style={{ 
                                                    borderBottom: "1px solid var(--border-subtle)", 
                                                    background: needsAttention && !isActive ? "rgba(186, 78, 78, 0.02)" : "transparent"
                                                }}
                                            >
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                                        <span style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>
                                                            {order.customer_name}
                                                        </span>
                                                        <span style={{ color: "var(--text-muted)", fontSize: "11px", display: "flex", alignItems: "center", gap: "2px", marginTop: "2px" }}>
                                                            <AtSign size={9} /> {order.ig_username || "N/A"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ fontWeight: "500", fontSize: "13px", color: "var(--text-primary)" }}>{order.product_name}</div>
                                                    <div className="mono" style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                        {order.quantity} x Rs {order.price.toLocaleString()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    <select 
                                                        value={order.payment_status} 
                                                        onClick={(e) => e.stopPropagation()} // Prevent selecting the row when changing dropdown
                                                        onChange={(e) => updateStatus(order.id, "payment_status", e.target.value)}
                                                        style={{ 
                                                            padding: "4px 8px", 
                                                            borderRadius: "var(--radius-sm)", 
                                                            fontSize: "11px", 
                                                            fontWeight: "600",
                                                            border: "1px solid var(--border)",
                                                            background: order.payment_status === "paid" ? "var(--success-soft)" : "var(--error-soft)",
                                                            color: order.payment_status === "paid" ? "var(--success)" : "var(--error)",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        <option value="unpaid">Unpaid</option>
                                                        <option value="paid">Paid</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                                                        <select 
                                                            value={order.delivery_status} 
                                                            onChange={(e) => updateStatus(order.id, "delivery_status", e.target.value)}
                                                            style={{ 
                                                                padding: "4px 8px", 
                                                                borderRadius: "var(--radius-sm)", 
                                                                fontSize: "11px", 
                                                                fontWeight: "600",
                                                                border: "1px solid var(--border)",
                                                                background: order.delivery_status === "delivered" ? "var(--success-soft)" : order.delivery_status === "shipped" ? "rgba(99, 91, 255, 0.05)" : "var(--warning-soft)",
                                                                color: order.delivery_status === "delivered" ? "var(--success)" : order.delivery_status === "shipped" ? "var(--accent)" : "var(--warning)",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="shipped">Shipped</option>
                                                            <option value="delivered">Delivered</option>
                                                        </select>
                                                        {needsAttention && (
                                                            <AlertCircle size={14} color="var(--error)" title="Needs update (3+ days old)" />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Order details console */}
                    <div className="order-details-pane">
                        {selectedOrder ? (
                            <>
                                <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "14px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                                                {selectedOrder.customer_name}
                                            </h3>
                                            {selectedOrder.ig_username ? (
                                                <a 
                                                    href={`https://instagram.com/${selectedOrder.ig_username.replace('@', '')}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--accent)", fontWeight: "600", textDecoration: "none", marginTop: "4px" }}
                                                >
                                                    <AtSign size={11} /> {selectedOrder.ig_username}
                                                    <ExternalLink size={10} />
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>No Instagram linked</span>
                                            )}
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end" }}>
                                                <Calendar size={11} /> {new Date(selectedOrder.order_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order summary card */}
                                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "14px" }}>
                                    <div className="caption" style={{ marginBottom: "8px", color: "var(--text-muted)" }}>Order Summary</div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{selectedOrder.product_name}</span>
                                        <span className="mono" style={{ fontSize: "13px", fontWeight: "600" }}>Qty: {selectedOrder.quantity}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px", marginTop: "8px" }}>
                                        <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>Total Value</span>
                                        <span className="mono" style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                                            Rs {(Number(selectedOrder.price) * (Number(selectedOrder.quantity) || 1)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Address / DM notes section */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                        <label className="caption" style={{ color: "var(--text-secondary)" }}>Customer Shipping & Note Details</label>
                                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Saves automatically</span>
                                    </div>
                                    <textarea 
                                        placeholder="Paste shipping address, phone number, and custom delivery instructions from Instagram DM chat..."
                                        value={orderNotes[selectedOrder.id] || ""}
                                        onChange={(e) => saveNote(selectedOrder.id, e.target.value)}
                                        style={{ 
                                            width: "100%", 
                                            height: "90px", 
                                            background: "var(--bg-primary)", 
                                            border: "1px solid var(--border)", 
                                            borderRadius: "var(--radius-md)", 
                                            padding: "10px", 
                                            fontSize: "12px", 
                                            color: "var(--text-primary)", 
                                            fontFamily: "var(--font-body)",
                                            resize: "none",
                                            outline: "none" 
                                        }}
                                    />
                                    {orderNotes[selectedOrder.id] && (
                                        <button
                                            onClick={() => handleCopyText(orderNotes[selectedOrder.id], "Address Details")}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                color: "var(--accent)",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                marginTop: "4px"
                                            }}
                                        >
                                            <Copy size={11} /> Copy Notes
                                        </button>
                                    )}
                                </div>

                                {/* DM Templates Action Hub */}
                                <div>
                                    <label className="caption" style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)" }}>One-Click DM Templates</label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        
                                        {/* Awaiting Payment */}
                                        <div className="action-card">
                                            <div className="action-card__info">
                                                <span style={{ fontSize: "12px", fontWeight: "700" }}>Payment Request</span>
                                                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Ask client to send cash screenshot</span>
                                            </div>
                                            <button 
                                                onClick={() => handleCopyText(dmTemplates.paymentPending, "Payment DM")}
                                                style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}
                                            >
                                                <Copy size={12} /> Copy
                                            </button>
                                        </div>

                                        {/* Payment Confirmed */}
                                        <div className="action-card">
                                            <div className="action-card__info">
                                                <span style={{ fontSize: "12px", fontWeight: "700" }}>Payment Confirmed</span>
                                                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Acknowledge payment & shipping prep</span>
                                            </div>
                                            <button 
                                                onClick={() => handleCopyText(dmTemplates.paymentReceived, "Confirmation DM")}
                                                style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}
                                            >
                                                <Copy size={12} /> Copy
                                            </button>
                                        </div>

                                        {/* Order Shipped */}
                                        <div className="action-card">
                                            <div className="action-card__info">
                                                <span style={{ fontSize: "12px", fontWeight: "700" }}>Shipping Alert</span>
                                                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Share details once dispatch is complete</span>
                                            </div>
                                            <button 
                                                onClick={() => handleCopyText(dmTemplates.orderShipped, "Shipping DM")}
                                                style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}
                                            >
                                                <Copy size={12} /> Copy
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Purchase History */}
                                <div>
                                    <label className="caption" style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)" }}>Customer History</label>
                                    {customerHistory.length === 0 ? (
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px", background: "var(--surface-raised)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-subtle)" }}>
                                            First order from this customer.
                                        </div>
                                    ) : (
                                        <div style={{ maxHeight: "100px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                                            {customerHistory.map(h => (
                                                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "var(--surface-raised)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: "11px" }}>
                                                    <div>
                                                        <span style={{ fontWeight: "600" }}>{h.product_name}</span>
                                                        <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>{new Date(h.order_date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div style={{ fontWeight: "700", color: h.payment_status === "paid" ? "var(--success)" : "var(--error)" }}>
                                                        Rs {h.price.toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px 10px", color: "var(--text-muted)", textAlign: "center" }}>
                                <MessageSquare size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
                                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", margin: 0 }}>No Order Selected</h3>
                                <p style={{ fontSize: "12px", marginTop: "4px" }}>Click on any order in the queue to load details and templates.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── New Order Drawer ────────────────────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
<<<<<<< HEAD
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} style={{ position: "absolute", inset: 0, background: "rgba(35,30,28,0.2)", backdropFilter: "blur(4px)" }} />
                        <motion.div 
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
=======
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowForm(false)}
                            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            style={{
                                position: "relative", width: "520px", maxWidth: "100%", height: "100%",
                                background: "var(--surface)", boxShadow: "-10px 0 30px rgba(0,0,0,0.12)",
                                padding: "40px", display: "flex", flexDirection: "column",
                                borderLeft: "1px solid var(--border)",
                            }}
                        >
<<<<<<< HEAD
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                                <h2 className="h2" style={{ fontSize: "18px", fontWeight: "750", margin: 0 }}>Add New Order</h2>
                                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
                            </div>

                            <form onSubmit={createOrder} style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, overflowY: "auto" }}>
                                <Input label="Customer Name *" placeholder="e.g. John Doe" value={newOrder.customer_name} onChange={e => setNewOrder(p => ({ ...p, customer_name: e.target.value }))} required />
                                <Input label="Instagram Username" placeholder="@username" value={newOrder.ig_username} onChange={e => setNewOrder(p => ({ ...p, ig_username: e.target.value }))} />
                                <div>
                                    <label className="caption" style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)" }}>Product SKU *</label>
                                    <select
                                      value={selectedProductId}
                                      onChange={(e) => setSelectedProductId(e.target.value)}
                                      required
                                      style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                                    >
                                      <option value="">Select Product SKU</option>
                                      {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                          {product.name} ({product.stock} left)
                                        </option>
                                      ))}
                                    </select>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <Input label="Quantity *" type="number" min="1" placeholder="1" value={newOrder.quantity} onChange={e => setNewOrder(p => ({ ...p, quantity: e.target.value }))} required />
                                    <Input label="Price (Rs) *" type="number" placeholder="0.00" value={newOrder.price} onChange={e => setNewOrder(p => ({ ...p, price: e.target.value }))} required />
                                </div>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                    <div>
                                        <label className="caption" style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)" }}>Payment Status</label>
                                        <select value={newOrder.payment_status} onChange={e => setNewOrder(p => ({ ...p, payment_status: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}>
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="caption" style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)" }}>Delivery Status</label>
                                        <select value={newOrder.delivery_status} onChange={e => setNewOrder(p => ({ ...p, delivery_status: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}>
                                            <option value="pending">Pending</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                        </select>
=======
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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
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
<<<<<<< HEAD
=======

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
>>>>>>> d77fe20171a6ef16cb038770117125dfa26ddae3
        </div>
    );
}
