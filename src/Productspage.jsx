import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Button, Badge, Skeleton, Input, springConfig } from "./components/UI";
import SyncBanner from "./components/SyncBanner";
import { Plus, Search, Edit2, Trash2, PackagePlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./hooks/useToast";

const AIDemandForecast = lazy(() => import("./components/AIDemandForecast"));
import {
  readProductsCache,
  writeProductsCache,
  touchProductsCache,
  appendProductToCache,
  updateProductInCache,
  removeProductFromCache,
  productsAreEqual,
} from "./services/productsCache";

const emptyProduct = { name: "", price: "", stock: "", category: "", reorder_level: "2" };

export default function ProductsPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formProduct, setFormProduct] = useState(emptyProduct);
    const [saving, setSaving] = useState(false);
    const [showForecast, setShowForecast] = useState(false);
    const [forecastProduct, setForecastProduct] = useState(null);

    // Sync-banner state
    const [staleBanner, setStaleBanner] = useState(false);
    const [applyingSyncData, setApplyingSyncData] = useState(false);
    const freshProductsRef = useRef([]);

    // ─── Cache-first load ────────────────────────────────────────────────────

    const loadFromCache = useCallback(() => {
        if (!user) return false;
        const cached = readProductsCache(user.id);
        if (cached) {
            setProducts(cached.products);
            setLoading(false);
            return true;
        }
        return false;
    }, [user]);

    const syncFromDB = useCallback(async (force = false) => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("user_id", user.id)
                .order("name", { ascending: true });

            if (error) throw error;
            const fresh = data || [];

            if (force) {
                setProducts(fresh);
                writeProductsCache(user.id, fresh);
                setStaleBanner(false);
                return;
            }

            const cached = readProductsCache(user.id);
            if (cached && productsAreEqual(cached.products, fresh)) {
                touchProductsCache(user.id);
            } else if (!cached) {
                setProducts(fresh);
                writeProductsCache(user.id, fresh);
            } else {
                freshProductsRef.current = fresh;
                setStaleBanner(true);
            }
        } catch (err) {
            console.warn("[ProductsPage] Background sync failed:", err.message);
        }
    }, [user]);

    const handleApplySync = useCallback(async () => {
        setApplyingSyncData(true);
        if (freshProductsRef.current.length > 0) {
            setProducts(freshProductsRef.current);
            writeProductsCache(user.id, freshProductsRef.current);
            freshProductsRef.current = [];
            setStaleBanner(false);
            setApplyingSyncData(false);
        } else {
            await syncFromDB(true);
            setApplyingSyncData(false);
        }
    }, [user, syncFromDB]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // ─── Form helpers ────────────────────────────────────────────────────────

    const openCreate = () => { setEditingId(null); setFormProduct(emptyProduct); setShowForm(true); };

    const openEdit = (product) => {
        setEditingId(product.id);
        setFormProduct({
            name: product.name,
            price: String(product.price),
            stock: String(product.stock ?? 0),
            category: product.category ?? '',
            reorder_level: String(product.reorder_level ?? 2),
        });
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditingId(null); setFormProduct(emptyProduct); };

    // ─── Save product (optimistic) ───────────────────────────────────────────

    const saveProduct = async () => {
        if (!formProduct.name || !formProduct.price) {
            showToast("Name and price are required.", "error");
            return;
        }

        try {
            setSaving(true);
            if (!user) { showToast("Please log in to manage inventory.", "error"); return; }

            const payload = {
                name: formProduct.name,
                price: Number(formProduct.price),
                stock: Number(formProduct.stock) || 0,
                category: formProduct.category,
                reorder_level: Number(formProduct.reorder_level),
                updated_at: new Date().toISOString(),
            };

            if (editingId) {
                // Optimistic update
                const optimistic = { ...products.find(p => p.id === editingId), ...payload };
                setProducts(prev => prev.map(p => p.id === editingId ? optimistic : p));
                updateProductInCache(user.id, optimistic);

                const { data, error } = await supabase
                    .from("products")
                    .update(payload)
                    .eq("id", editingId)
                    .eq("user_id", user.id)
                    .select();

                if (error) {
                    // Revert
                    syncFromDB(true);
                    throw error;
                }
                // Apply confirmed data
                setProducts(prev => prev.map(p => p.id === editingId ? data[0] : p));
                updateProductInCache(user.id, data[0]);
                showToast("Product updated.", "success");
            } else {
                const { data, error } = await supabase
                    .from("products")
                    .insert([{ ...payload, user_id: user.id, created_at: new Date().toISOString() }])
                    .select();

                if (error) throw error;

                // Optimistic add to UI + cache
                setProducts(prev => [data[0], ...prev].sort((a, b) => a.name.localeCompare(b.name)));
                appendProductToCache(user.id, data[0]);
                showToast("Product added.", "success");
            }

            closeForm();
            try { window.dispatchEvent(new Event('sellersync-data-changed')); } catch { /**/ }
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to save product.", "error");
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete product (optimistic) ─────────────────────────────────────────

    const deleteProduct = async (id) => {
        if (!window.confirm("Remove this product from inventory?")) return;
        if (!user) return;

        // Optimistic remove
        setProducts(prev => prev.filter(p => p.id !== id));
        removeProductFromCache(user.id, id);

        const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user.id);
        if (error) {
            // Revert
            syncFromDB(true);
            showToast(error.message || "Could not delete product.", "error");
            return;
        }
        showToast("Product removed.", "info");
    };

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1 className="h1">Inventory</h1>
                    <p className="subheading" style={{ marginTop: "8px" }}>Manage your store items and stock levels.</p>
                </div>
                {products.length > 0 && (
                    <Button onClick={openCreate}>
                        <Plus size={14} />
                        Add Product
                    </Button>
                )}
            </div>

            {/* Sync Banner */}
            <SyncBanner
                visible={staleBanner}
                syncing={applyingSyncData}
                message="Product inventory has been updated — your view may be outdated."
                onApply={handleApplySync}
                onDismiss={() => setStaleBanner(false)}
            />

            {loading ? (
                <div style={{ marginTop: "32px" }}>
                    <Skeleton height="40px" className="mb-8" />
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} height="60px" className="mb-2" />)}
                </div>
            ) : products.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springConfig}
                    style={{
                        marginTop: "40px",
                        padding: "100px 40px",
                        textAlign: "center",
                        border: "1px dashed var(--border)",
                        borderRadius: "var(--radius-lg)",
                        background: "var(--surface-raised)",
                        boxShadow: "var(--shadow-md)"
                    }}
                >
                    <div style={{ width: "48px", height: "48px", background: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                        <PackagePlus size={24} color="var(--text-muted)" />
                    </div>
                    <h3 className="h2" style={{ fontSize: "18px", marginBottom: "12px" }}>Your inventory is empty</h3>
                    <p className="body" style={{ color: "var(--text-secondary)", maxWidth: "320px", margin: "0 auto 32px" }}>
                        Add your first product to start tracking stock and generating orders for your store.
                    </p>
                    <Button onClick={openCreate}>
                        <Plus size={14} />
                        Add Your First Product
                    </Button>
                </motion.div>
            ) : (
                <>
                    <div className="premium-search">
                        <Search size={14} color="var(--text-muted)" />
                        <input
                            placeholder="Search inventory..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ background: "transparent", border: "none", color: "var(--text-primary)", outline: "none", fontSize: "14px", flex: 1, fontFamily: "var(--font-sans)" }}
                        />
                    </div>

                    <div className="table-shell">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                                <th className="caption" style={{ padding: "16px 0" }}>Name</th>
                                <th className="caption" style={{ padding: "16px 0" }}>Status</th>
                                <th className="caption" style={{ padding: "16px 0" }}>Stock</th>
                                <th className="caption" style={{ padding: "16px 0" }}>Price</th>
                                <th className="caption" style={{ padding: "16px 0", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <motion.tbody initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
                            {filtered.map((product) => (
                                <motion.tr
                                    key={product.id}
                                    variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                                    transition={springConfig}
                                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                >
                                    <td className="body" style={{ padding: "20px 0", fontWeight: "500" }}>{product.name}</td>
                                    <td style={{ padding: "20px 0" }}>
                                        {(() => {
                                            const reorder = Number(product.reorder_level ?? 2);
                                            const qty = Number(product.stock ?? 0);
                                            if (qty <= 0) return <Badge status="error">Out</Badge>;
                                            if (qty <= reorder) return <Badge status="warning">Low</Badge>;
                                            return <Badge status="success">In Stock</Badge>;
                                        })()}
                                    </td>
                                    <td className="mono" style={{ padding: "20px 0", color: "var(--text-secondary)" }}>{product.stock}</td>
                                    <td className="mono" style={{ padding: "20px 0", fontWeight: "600" }}>Rs {product.price.toLocaleString()}</td>
                                    <td style={{ padding: "20px 0", textAlign: "right" }}>
                                        <div style={{ display: "flex", gap: "20px", justifyContent: "flex-end" }}>
                                            <button type="button" aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><Edit2 size={13} /></button>
                                            <button type="button" aria-label={`Forecast ${product.name}`} onClick={() => { setForecastProduct(product.id); setShowForecast(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }} title="Forecast"><PackagePlus size={13} /></button>
                                            <button type="button" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)" }}><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </motion.tbody>
                    </table>
                    </div>
                </>
            )}

            <AnimatePresence>
                {showForm && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeForm} style={{ position: "absolute", inset: 0, background: "rgba(31,33,25,0.16)", backdropFilter: "blur(4px)" }} />
                        <motion.div className="drawer-panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} style={{ position: "relative", width: "400px", height: "100%", padding: "48px", display: "flex", flexDirection: "column" }}>
                            <h2 className="h2" style={{ marginBottom: "32px" }}>{editingId ? "Edit Product" : "New Product"}</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                <Input label="Product Name" placeholder="e.g. Silk Saree" value={formProduct.name} onChange={(e) => setFormProduct(p => ({ ...p, name: e.target.value }))} />
                                <Input label="Price (INR)" type="number" placeholder="0" value={formProduct.price} onChange={(e) => setFormProduct(p => ({ ...p, price: e.target.value }))} />
                                <Input label="Stock" type="number" placeholder="0" value={formProduct.stock} onChange={(e) => setFormProduct(p => ({ ...p, stock: e.target.value }))} />
                                <Input label="Category" placeholder="e.g. Apparel" value={formProduct.category} onChange={(e) => setFormProduct(p => ({ ...p, category: e.target.value }))} />
                                <Input label="Reorder Level" type="number" placeholder="2" value={formProduct.reorder_level} onChange={(e) => setFormProduct(p => ({ ...p, reorder_level: e.target.value }))} />
                            </div>
                            <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <Button variant="secondary" onClick={closeForm} disabled={saving}>Cancel</Button>
                                <Button onClick={saveProduct} disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Save Product"}</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {showForecast && (
                <Suspense fallback={<div className="loading-container" style={{ padding: '20px', textAlign: 'center' }}>Loading Forecast...</div>}>
                    <AIDemandForecast productId={forecastProduct} onClose={() => setShowForecast(false)} />
                </Suspense>
            )}
        </div>
    );
}
