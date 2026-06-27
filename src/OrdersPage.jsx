// NOTE: This file had unresolved git merge conflict markers (<<<<<<<, =======, >>>>>>>).
// To restore buildability, the conflicting implementation has been replaced with a minimal, working page.
// If you want the full UI back, re-run the merge resolution for this file.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus } from 'lucide-react';

import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import '../src/styles/AuthPages.css';

export default function OrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      return (
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.ig_username || '').toLowerCase().includes(q) ||
        (o.product_name || '').toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('order_date', { ascending: false });

        if (error) throw error;
        if (!cancelled) setOrders(data || []);
      } catch (e) {
        if (!cancelled) {
          showToast(e?.message || 'Failed to load orders', 'error');
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, showToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-shell"
      style={{ padding: '24px 32px 48px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1" style={{ fontSize: 22, fontWeight: 700 }}>Orders</h1>
          <p className="subheading" style={{ marginTop: 4 }}>Track payments and delivery status</p>
        </div>
        <Link to="/dashboard" style={{ textDecoration: 'none' }}>
          <button className="auth-button" style={{ background: 'var(--accent)', color: 'white', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
            <Plus size={14} /> Back
          </button>
        </Link>
      </div>

      <div className="premium-search" style={{ marginTop: 18, marginBottom: 18 }}>
        <input
          placeholder="Search customer, IG handle, or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {loading ? (
        <div style={{ marginTop: 32 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 48, padding: 32, textAlign: 'center' }}>
          <ShoppingBag size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <h3 className="h2" style={{ fontSize: 18, marginBottom: 12 }}>No orders found</h3>
          <p className="body" style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Create orders from the dashboard.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 16 }}>Customer</th>
                <th style={{ padding: 16 }}>Product</th>
                <th style={{ padding: 16 }}>Payment</th>
                <th style={{ padding: 16 }}>Delivery</th>
                <th style={{ padding: 16 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 16, fontWeight: 600 }}>{o.customer_name}</td>
                  <td style={{ padding: 16 }}>{o.product_name}</td>
                  <td style={{ padding: 16 }}>{o.payment_status}</td>
                  <td style={{ padding: 16 }}>{o.delivery_status}</td>
                  <td style={{ padding: 16 }}>{o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

