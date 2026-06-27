import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, PackagePlus, Edit2, Trash2, X } from 'lucide-react';

import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { Badge, Skeleton, Button, Input, springConfig } from './components/UI';
import SyncBanner from './components/SyncBanner';

const AIDemandForecast = lazy(() => import('./components/AIDemandForecast'));

export default function ProductsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [staleBanner, setStaleBanner] = useState(false);
  const [applyingSyncData, setApplyingSyncData] = useState(false);

  const [showForecast, setShowForecast] = useState(false);
  const [forecastProduct, setForecastProduct] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formProduct, setFormProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: '',
    reorder_level: '2',
  });
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (e) {
      showToast(e?.message || 'Failed to load products', 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handler = () => fetchProducts();
    window.addEventListener('sellersync-data-changed', handler);
    return () => window.removeEventListener('sellersync-data-changed', handler);
  }, []);

  const handleApplySync = async () => {
    setApplyingSyncData(true);
    await fetchProducts();
    setStaleBanner(false);
    setApplyingSyncData(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [products, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormProduct({ name: '', price: '', stock: '', category: '', reorder_level: '2' });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setFormProduct({
      name: p.name ?? '',
      price: String(p.price ?? ''),
      stock: String(p.stock ?? ''),
      category: p.category ?? '',
      reorder_level: String(p.reorder_level ?? 2),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const saveProduct = async () => {
    if (!user) {
      showToast('Please log in.', 'error');
      return;
    }

    if (!formProduct.name || formProduct.price === '') {
      showToast('Name and price are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formProduct.name,
        price: Number(formProduct.price),
        stock: Number(formProduct.stock) || 0,
        category: formProduct.category,
        reorder_level: Number(formProduct.reorder_level) || 2,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id)
          .select();

        if (error) throw error;

        setProducts((prev) => prev.map((x) => (x.id === editingId ? data[0] : x)));
        showToast('Product updated.', 'success');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([{ ...payload, user_id: user.id, created_at: new Date().toISOString() }])
          .select();

        if (error) throw error;

        setProducts((prev) => [data[0], ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Product added.', 'success');
      }

      try {
        window.dispatchEvent(new Event('sellersync-data-changed'));
      } catch {}

      closeForm();
    } catch (e) {
      showToast(e?.message || 'Failed to save product.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Remove this product?')) return;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product removed.', 'info');

      try {
        window.dispatchEvent(new Event('sellersync-data-changed'));
      } catch {}
    } catch (e) {
      showToast(e?.message || 'Could not delete product.', 'error');
    }
  };

  const adjustStock = async (product, amount) => {
    if (!user) return;

    const nextStock = Math.max(0, Number(product.stock ?? 0) + amount);

    // optimistic
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: nextStock } : p)));

    const { error } = await supabase
      .from('products')
      .update({ stock: nextStock, updated_at: new Date().toISOString() })
      .eq('id', product.id)
      .eq('user_id', user.id);

    if (error) {
      // revert
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: product.stock } : p)));
      showToast(error.message || 'Failed to update stock.', 'error');
      return;
    }

    showToast(`Updated ${product.name} stock.`, 'success');

    try {
      window.dispatchEvent(new Event('sellersync-data-changed'));
    } catch {}
  };

  const statusBadge = (product) => {
    const reorder = Number(product.reorder_level ?? 2);
    const qty = Number(product.stock ?? 0);
    if (qty <= 0) return <Badge status="error">OUT OF STOCK</Badge>;
    if (qty <= reorder) return <Badge status="warning">LOW STOCK</Badge>;
    return <Badge status="success">IN STOCK</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-shell"
      style={{ padding: '24px 32px 48px' }}
    >
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 22, fontWeight: 700 }}>
            Store Inventory
          </h1>
          <p className="subheading" style={{ marginTop: 4 }}>
            Track SKU quantities, price points, and reorder triggers.
          </p>
        </div>
        {products.length > 0 && (
          <Button
            onClick={openCreate}
            style={{ background: 'var(--accent)', color: 'white', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}
          >
            <Plus size={14} /> Add Product
          </Button>
        )}
      </div>

      <SyncBanner
        visible={staleBanner}
        syncing={applyingSyncData}
        message="Product inventory has been updated — your view may be outdated."
        onApply={handleApplySync}
        onDismiss={() => setStaleBanner(false)}
      />

      {loading ? (
        <div style={{ marginTop: 32 }}>
          <Skeleton height="40px" className="mb-8" />
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} height="60px" className="mb-2" />
            ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          style={{
            marginTop: 40,
            padding: '100px 40px',
            textAlign: 'center',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: 'var(--surface)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <Plus size={20} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 750, marginBottom: 8, color: 'var(--text-primary)' }}>
            Your inventory is empty
          </h3>
          <p className="body" style={{ color: 'var(--text-secondary)', maxWidth: 340, margin: '0 auto 24px' }}>
            Add your first product SKU to start recording orders and tracking low-stock alerts.
          </p>
          <Button onClick={openCreate} style={{ background: 'var(--accent)', color: 'white' }}>
            <Plus size={14} /> Create First Product
          </Button>
        </motion.div>
      ) : (
        <>
          <div className="premium-search" style={{ marginBottom: 20 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-shell">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th className="caption" style={{ padding: '16px 0' }}>
                    Name
                  </th>
                  <th className="caption" style={{ padding: '16px 0' }}>
                    Status
                  </th>
                  <th className="caption" style={{ padding: '16px 0' }}>
                    Stock
                  </th>
                  <th className="caption" style={{ padding: '16px 0' }}>
                    Price
                  </th>
                  <th className="caption" style={{ padding: '16px 0', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>

              <motion.tbody
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {filtered.map((product) => (
                  <motion.tr
                    key={product.id}
                    variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                    transition={springConfig}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="body" style={{ padding: '20px 0', fontWeight: 500 }}>
                      {product.name}
                    </td>
                    <td style={{ padding: '20px 0' }}>{statusBadge(product)}</td>
                    <td className="mono" style={{ padding: '20px 0', color: 'var(--text-secondary)' }}>
                      {product.stock}
                    </td>
                    <td className="mono" style={{ padding: '20px 0', fontWeight: 600 }}>
                      Rs {product.price?.toLocaleString ? product.price.toLocaleString() : product.price}
                    </td>
                    <td style={{ padding: '20px 0', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 20, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          aria-label={`Edit ${product.name}`}
                          onClick={() => openEdit(product)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Forecast ${product.name}`}
                          onClick={() => {
                            setForecastProduct(product.id);
                            setShowForecast(true);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          title="Forecast"
                        >
                          <PackagePlus size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => deleteProduct(product.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                          <button
                            type="button"
                            onClick={() => adjustStock(product, -1)}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                            title="Decrease stock by 1"
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', color: 'var(--text-primary)', fontSize: 13 }}>
                            {product.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustStock(product, 1)}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                            title="Increase stock by 1"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <Suspense fallback={null}>
          {/* Drawer */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              style={{ position: 'absolute', inset: 0, background: 'rgba(31,33,25,0.16)', backdropFilter: 'blur(4px)' }}
            />

            <motion.div
              className="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ position: 'relative', width: 400, height: '100%', padding: 48, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <h2 className="h2" style={{ margin: 0, fontSize: 18, fontWeight: 750 }}>
                  {editingId ? 'Edit Product' : 'New Product'}
                </h2>
                <button
                  onClick={closeForm}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Input
                  label="Product Name"
                  placeholder="e.g. Silk Saree"
                  value={formProduct.name}
                  onChange={(e) => setFormProduct((p) => ({ ...p, name: e.target.value }))}
                />
                <Input
                  label="Price (INR)"
                  type="number"
                  placeholder="0"
                  value={formProduct.price}
                  onChange={(e) => setFormProduct((p) => ({ ...p, price: e.target.value }))}
                />
                <Input
                  label="Stock"
                  type="number"
                  placeholder="0"
                  value={formProduct.stock}
                  onChange={(e) => setFormProduct((p) => ({ ...p, stock: e.target.value }))}
                />
                <Input
                  label="Category"
                  placeholder="e.g. Apparel"
                  value={formProduct.category}
                  onChange={(e) => setFormProduct((p) => ({ ...p, category: e.target.value }))}
                />
                <Input
                  label="Reorder Level"
                  type="number"
                  placeholder="2"
                  value={formProduct.reorder_level}
                  onChange={(e) => setFormProduct((p) => ({ ...p, reorder_level: e.target.value }))}
                />
              </div>

              <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Button variant="secondary" onClick={closeForm} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={saveProduct}
                  disabled={saving}
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  {saving ? 'Saving...' : editingId ? 'Update SKU' : 'Save SKU'}
                </Button>
              </div>
            </motion.div>
          </div>
        </Suspense>
      )}

      {showForecast && (
        <Suspense fallback={<div className="loading-container" style={{ padding: 20, textAlign: 'center' }}>Loading Forecast...</div>}>
          <AIDemandForecast
            productId={forecastProduct}
            onClose={() => setShowForecast(false)}
          />
        </Suspense>
      )}
    </motion.div>
  );
}

