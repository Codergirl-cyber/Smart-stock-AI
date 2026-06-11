import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { useAuth } from "../hooks/useAuth";
import { Skeleton, Badge, Button } from "../components/UI";
import { Search, Users, AtSign, ShoppingBag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../hooks/useToast";

function aggregateCustomers(orders) {
  const map = new Map();

  orders.forEach((order) => {
    const name = (order.customer_name || "Unknown").trim();
    if (!map.has(name)) {
      map.set(name, {
        name,
        ig_username: order.ig_username || null,
        orders: [],
        totalSpent: 0,
        paidCount: 0,
        pendingDelivery: 0,
        lastOrderDate: null,
      });
    }
    const customer = map.get(name);
    customer.orders.push(order);
    customer.totalSpent += Number(order.price) || 0;
    if (order.payment_status === "paid") customer.paidCount += 1;
    if (order.delivery_status === "pending") customer.pendingDelivery += 1;
    if (order.ig_username && !customer.ig_username) customer.ig_username = order.ig_username;
    const date = order.order_date;
    if (!customer.lastOrderDate || date > customer.lastOrderDate) {
      customer.lastOrderDate = date;
    }
  });

  return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

export default function CustomersPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      await Promise.resolve();

      try {
        setLoading(true);
        if (!user) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("order_date", { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error(err);
        showToast("Could not load customers.", "error");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, showToast]);

  const customers = useMemo(() => aggregateCustomers(orders), [orders]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.ig_username && c.ig_username.toLowerCase().includes(q))
    );
  });

  const totalCustomers = customers.length;
  const repeatBuyers = customers.filter((c) => c.orders.length > 1).length;

  return (
    <div className="page-shell">
      <header className="page-header" style={{ marginBottom: "32px" }}>
        <div>
          <h1 className="h1">Customers</h1>
          <p className="subheading" style={{ marginTop: "8px" }}>
            CRM view built from your order history — no duplicate data entry.
          </p>
        </div>
        <Link to="/orders">
          <Button variant="secondary">
            <ShoppingBag size={14} />
            New order
          </Button>
        </Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="stat-card">
          <div className="caption">Total customers</div>
          <div className="h2">{loading ? "—" : totalCustomers}</div>
        </div>
        <div className="stat-card">
          <div className="caption">Repeat buyers</div>
          <div className="h2">{loading ? "—" : repeatBuyers}</div>
        </div>
        <div className="stat-card">
          <div className="caption">Lifetime value</div>
          <div className="h2">
            {loading ? "—" : `Rs ${customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString()}`}
          </div>
        </div>
      </div>

      <div className="premium-search" style={{ marginBottom: "24px" }}>
        <Search size={14} color="var(--text-muted)" />
        <input
          placeholder="Search name or @instagram..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            outline: "none",
            fontSize: "14px",
            flex: 1,
            fontFamily: "var(--font-sans)",
          }}
        />
      </div>

      {loading ? (
        <div>
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} height="56px" className="mb-2" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
          <h3 className="h2">No customers yet</h3>
          <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Customers appear automatically when you create orders.
          </p>
          <Link to="/orders">
            <Button>
              <ShoppingBag size={16} />
              Create first order
            </Button>
          </Link>
        </div>
      ) : (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th className="caption" style={{ padding: "16px 0" }}>Customer</th>
                <th className="caption" style={{ padding: "16px 0" }}>Orders</th>
                <th className="caption" style={{ padding: "16px 0" }}>Total spent</th>
                <th className="caption" style={{ padding: "16px 0" }}>Status</th>
                <th className="caption" style={{ padding: "16px 0" }}>Last order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.name}
                  onClick={() => setSelected(customer)}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "18px 0" }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{customer.name}</div>
                    {customer.ig_username && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                        <AtSign size={10} />
                        {customer.ig_username}
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ padding: "18px 0" }}>{customer.orders.length}</td>
                  <td className="mono" style={{ padding: "18px 0", fontWeight: "600" }}>
                    Rs {customer.totalSpent.toLocaleString()}
                  </td>
                  <td style={{ padding: "18px 0" }}>
                    {customer.pendingDelivery > 0 ? (
                      <Badge status="warning">{customer.pendingDelivery} pending</Badge>
                    ) : (
                      <Badge status="success">Clear</Badge>
                    )}
                  </td>
                  <td className="body" style={{ padding: "18px 0", color: "var(--text-secondary)", fontSize: "13px" }}>
                    {customer.lastOrderDate
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-backdrop"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="modal-panel"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 className="h2" style={{ marginBottom: "4px" }}>{selected.name}</h2>
                  <p className="caption">Customer profile</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="icon-btn" aria-label="Close">
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
                <div className="stat-card stat-card--compact">
                  <div className="caption">Orders</div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>{selected.orders.length}</div>
                </div>
                <div className="stat-card stat-card--compact">
                  <div className="caption">Spent</div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>Rs {selected.totalSpent.toLocaleString()}</div>
                </div>
                <div className="stat-card stat-card--compact">
                  <div className="caption">Paid</div>
                  <div style={{ fontWeight: "700", fontSize: "18px" }}>{selected.paidCount}</div>
                </div>
              </div>

              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {selected.orders.map((o) => (
                  <div key={o.id} className="activity-row">
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "14px" }}>{o.product_name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {new Date(o.order_date).toLocaleDateString()} · {o.payment_status} · {o.delivery_status}
                      </div>
                    </div>
                    <div className="mono" style={{ fontWeight: "600" }}>Rs {o.price}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
