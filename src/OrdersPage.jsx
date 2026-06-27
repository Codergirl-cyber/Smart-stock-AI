import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, Button, Input } from "./components/UI";
import { Search, Plus, ShoppingBag, AtSign, AlertCircle, X, Copy, Check, MessageSquare, Clipboard, ExternalLink, Calendar, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./hooks/useToast";

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
    const [selectedProductId, setSelectedProductId] = useState("");
    
    // Notes stored in LocalStorage for order addresses/notes
    const [orderNotes, setOrderNotes] = useState({});

    const [newOrder, setNewOrder] = useState({
        customer_name: "",
        ig_username: "",
        product_name: "",
        quantity: 1,
        price: "",
        payment_status: "unpaid",
        delivery_status: "pending",
        order_date: new Date().toISOString().split("T")[0]
    });

    const fetchOrders = useCallback(async () => {
        if (!user) {
            setOrders([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("user_id", user.id)
                .order("order_date", { ascending: false });
            
            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error(err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchProducts = useCallback(async () => {
        if (!user) {
            setProducts([]);
            return;
        }

        const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("user_id", user.id)
            .order("name", { ascending: true });

        if (error) {
            console.error("Products error:", error);
            return;
        }

        setProducts(data || []);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        fetchOrders();
        fetchProducts();
    }, [user, fetchOrders, fetchProducts]);

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
        const quantity = Number(newOrder.quantity);
        const price = Number(newOrder.price);

        if (!newOrder.customer_name || !price || !quantity || !selectedProductId) {
            showToast("Fill in customer, product, quantity, and price.", "error");
            return;
        }

        if (quantity < 1) {
            showToast("Quantity must be at least 1.", "error");
            return;
        }

        try {
            if (!user) {
                showToast("Please log in to create orders.", "error");
                return;
            }

            const selectedProduct = products.find((p) => p.id === selectedProductId);
            const productName = selectedProduct?.name ?? null;

            const insertPayload = {
                user_id: user.id,
                customer_name: newOrder.customer_name,
                ig_username: newOrder.ig_username || null,
                product_id: selectedProductId,
                product_name: productName,
                quantity,
                price,
                payment_status: newOrder.payment_status,
                delivery_status: newOrder.delivery_status,
                order_date: newOrder.order_date,
            };

            Object.keys(insertPayload).forEach((k) => {
                if (insertPayload[k] === undefined || insertPayload[k] === null) delete insertPayload[k];
            });

            const { data: insertedList, error } = await supabase
                .from("orders")
                .insert(insertPayload)
                .select();

            if (error) throw error;

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
            tryDispatchEvent();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to complete order. Check stock and try again.", "error");
        }
    };

    const updateStatus = async (id, field, value) => {
        try {
            if (!user) {
                showToast("Please log in to update orders", "error");
                return;
            }

            const { error } = await supabase
                .from("orders")
                .update({ [field]: value, updated_at: new Date().toISOString() })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) throw error;

            setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
            showToast("Order updated.", "success");
            tryDispatchEvent();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to update order.", "error");
        }
    };

    const tryDispatchEvent = () => {
        try {
            window.dispatchEvent(new Event('sellersync-data-changed'));
        } catch (err) {
            console.warn('Event dispatch failed', err);
        }
    };

    const isOld = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 3;
    };

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
                    ))}
                </div>
            </div>

            {loading ? (
                <div>
                    <Skeleton height="40px" className="mb-8" />
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} height="70px" className="mb-2" />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
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

            {/* New Order Drawer */}
            <AnimatePresence>
                {showForm && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} style={{ position: "absolute", inset: 0, background: "rgba(35,30,28,0.2)", backdropFilter: "blur(4px)" }} />
                        <motion.div 
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            style={{ position: "relative", width: "450px", maxWidth: "100%", height: "100%", background: "var(--surface)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", padding: "40px", display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)" }}
                        >
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
                                    </div>
                                </div>

                                <Input label="Order Date" type="date" value={newOrder.order_date} onChange={e => setNewOrder(p => ({ ...p, order_date: e.target.value }))} />
                                
                                <div style={{ marginTop: "auto", paddingTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                                    <Button type="submit" style={{ background: "var(--accent)", color: "white" }}>Create Order</Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
