import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton, Button, Input } from "./components/UI";
import { Search, Plus, ShoppingBag, AtSign, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./hooks/useToast";

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
    const [selectedProductId, setSelectedProductId] = useState("");

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
        await Promise.resolve();

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
        await Promise.resolve();

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
        const timer = window.setTimeout(() => {
            fetchOrders();
            fetchProducts();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [user, fetchOrders, fetchProducts]);

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

            // Simplest order creation: direct insert into orders table (no RPC calls)
            const selectedProduct = products.find((p) => p.id === selectedProductId);
            const productName = selectedProduct?.name ?? null;

            // Build insert payload from frontend values + selection
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

            // Omit null/undefined optional fields so we don't assume nullable columns
            Object.keys(insertPayload).forEach((k) => {
                if (insertPayload[k] === undefined || insertPayload[k] === null) delete insertPayload[k];
            });

            const { data: inserted, error } = await supabase
                .from("orders")
                .insert(insertPayload)
                .select()
                .single();

            if (error) throw error;

            // Refresh UI (order will appear in dashboard because it's filtered by user_id)
            await fetchOrders();
            await fetchProducts();
            setShowForm(false);
            showToast("Order created successfully.", "success");
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
            // notify dashboard and other views to refresh
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

    const filtered = orders.filter(o => {
        const matchesSearch = 
            o.customer_name.toLowerCase().includes(search.toLowerCase()) || 
            o.ig_username?.toLowerCase().includes(search.toLowerCase()) ||
            (o.product_name && o.product_name.toLowerCase().includes(search.toLowerCase()));
        
        if (filter === "unpaid") return matchesSearch && o.payment_status === "unpaid";
        if (filter === "pending") return matchesSearch && o.delivery_status === "pending";
        return matchesSearch;
    });

    const customerHistory = selectedCustomer 
        ? orders.filter(o => o.customer_name === selectedCustomer) 
        : [];

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
                    <button 
                        onClick={() => setFilter("all")}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: filter === "all" ? "var(--accent-soft)" : "var(--surface)", color: filter === "all" ? "var(--accent)" : "var(--text-secondary)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilter("unpaid")}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: filter === "unpaid" ? "rgba(239, 68, 68, 0.1)" : "var(--surface)", color: filter === "unpaid" ? "var(--error)" : "var(--text-secondary)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                    >
                        Unpaid
                    </button>
                    <button 
                        onClick={() => setFilter("pending")}
                        style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border)", background: filter === "pending" ? "rgba(234, 179, 8, 0.1)" : "var(--surface)", color: filter === "pending" ? "var(--warning)" : "var(--text-secondary)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                    >
                        Pending Delivery
                    </button>
                </div>
            </div>

            {loading ? (
                <div>
                    <Skeleton height="40px" className="mb-8" />
                    {Array(6).fill(0).map((_, i) => <Skeleton key={i} height="60px" className="mb-2" />)}
                </div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
                    <h3 className="h2">No orders tracked yet</h3>
                    <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Start adding your Instagram orders to keep track of payments and deliveries.</p>
                    <Button onClick={() => setShowForm(true)}><Plus size={16} />Add Your First Order</Button>
                </div>
            ) : (
                <div className="table-shell" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                                <th className="caption" style={{ padding: "16px" }}>Customer / IG</th>
                                <th className="caption" style={{ padding: "16px" }}>Product</th>
                                <th className="caption" style={{ padding: "16px" }}>Quantity</th>
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
                                            background: needsAttention ? "rgba(239, 68, 68, 0.03)" : "transparent",
                                            transition: "background 0.2s ease"
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
                                                    padding: "4px 8px", 
                                                    borderRadius: "6px", 
                                                    fontSize: "12px", 
                                                    fontWeight: "600",
                                                    border: "1px solid var(--border)",
                                                    background: order.payment_status === "paid" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                                    color: order.payment_status === "paid" ? "var(--success)" : "var(--error)"
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
                                                    padding: "4px 8px", 
                                                    borderRadius: "6px", 
                                                    fontSize: "12px", 
                                                    fontWeight: "600",
                                                    border: "1px solid var(--border)",
                                                    background: order.delivery_status === "delivered" ? "rgba(34, 197, 94, 0.1)" : order.delivery_status === "shipped" ? "rgba(59, 130, 246, 0.1)" : "rgba(234, 179, 8, 0.1)",
                                                    color: order.delivery_status === "delivered" ? "var(--success)" : order.delivery_status === "shipped" ? "#3b82f6" : "var(--warning)"
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

            {/* New Order Drawer */}
            <AnimatePresence>
                {showForm && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }} />
                        <motion.div 
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} 
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            style={{ position: "relative", width: "450px", maxWidth: "100%", height: "100%", background: "var(--surface)", boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", padding: "40px", display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)" }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                                <h2 className="h2">New Order</h2>
                                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
                            </div>

                            <form onSubmit={createOrder} style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, overflowY: "auto" }}>
                                <Input label="Customer Name *" placeholder="e.g. John Doe" value={newOrder.customer_name} onChange={e => setNewOrder(p => ({ ...p, customer_name: e.target.value }))} required />
                                <Input label="Instagram Username" placeholder="@username" value={newOrder.ig_username} onChange={e => setNewOrder(p => ({ ...p, ig_username: e.target.value }))} />
                                <div>
                                    <label className="caption" style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)" }}>Product</label>
                                    <select
                                      value={selectedProductId}
                                      onChange={(e) => setSelectedProductId(e.target.value)}
                                      required
                                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)" }}
                                    >
                                      <option value="">Select Product</option>
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
                                        <label className="caption" style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)" }}>Payment Status</label>
                                        <select value={newOrder.payment_status} onChange={e => setNewOrder(p => ({ ...p, payment_status: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)" }}>
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="caption" style={{ display: "block", marginBottom: "8px", color: "var(--text-muted)" }}>Delivery Status</label>
                                        <select value={newOrder.delivery_status} onChange={e => setNewOrder(p => ({ ...p, delivery_status: e.target.value }))} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)" }}>
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

            {/* Customer History Modal */}
            <AnimatePresence>
                {selectedCustomer && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCustomer(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ position: "relative", width: "100%", maxWidth: "700px", background: "var(--surface)", borderRadius: "16px", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                                <div>
                                    <h2 className="h2" style={{ marginBottom: "4px" }}>{selectedCustomer}</h2>
                                    <p className="caption">Customer Order History</p>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={20} /></button>
                            </div>

                            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                                {customerHistory.map(o => (
                                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <div>
                                            <div style={{ fontWeight: "600", fontSize: "14px" }}>{o.product_name}</div>
                                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{new Date(o.order_date).toLocaleDateString()}</div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div className="mono" style={{ fontWeight: "600" }}>Rs {o.price}</div>
                                            <div style={{ fontSize: "11px", color: o.payment_status === "paid" ? "var(--success)" : "var(--error)" }}>{o.payment_status.toUpperCase()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: "24px", textAlign: "right" }}>
                                <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>Close</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

