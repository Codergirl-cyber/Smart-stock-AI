import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { useAuth } from "../hooks/useAuth";
import { Skeleton, Badge, Button } from "../components/UI";
import { Search, Users, AtSign, ShoppingBag, X, Calendar, Receipt, TrendingUp } from "lucide-react";
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
    customer.totalSpent += (Number(order.price) * (Number(order.quantity) || 1)) || 0;
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
    <div className="page-shell" style={{ padding: "24px 32px 48px" }}>
      <header className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="h1" style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)" }}>Customer CRM</h1>
          <p className="subheading" style={{ marginTop: "4px" }}>
            Customer ledger compiled directly from purchase records.
          </p>
        </div>
        <Link to="/orders">
          <Button style={{ background: "var(--accent)", color: "white", padding: "8px 14px", borderRadius: "var(--radius-md)" }}>
            <ShoppingBag size={14} />
            New order
          </Button>
        </Link>
      </header>

      {/* CRM Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="stat-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px", borderRadius: "var(--radius-lg)" }}>
          <div className="caption" style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Total Customers</div>
          <div style={{ fontSize: "20px", fontWeight: "750", color: "var(--text-primary)" }}>{loading ? "—" : totalCustomers}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px", borderRadius: "var(--radius-lg)" }}>
          <div className="caption" style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Repeat Buyers</div>
          <div style={{ fontSize: "20px", fontWeight: "750", color: "var(--text-primary)" }}>{loading ? "—" : repeatBuyers}</div>
        </div>
        <div className="stat-card" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "16px", borderRadius: "var(--radius-lg)" }}>
          <div className="caption" style={{ color: "var(--text-muted)", marginBottom: "4px" }}>Lifetime Revenue</div>
          <div style={{ fontSize: "20px", fontWeight: "750", color: "var(--success)" }}>
            {loading ? "—" : `Rs ${customers.reduce((s, c) => s + c.totalSpent, 0).toLocaleString()}`}
          </div>
        </div>
      </div>

      <div className="premium-search" style={{ marginBottom: "20px" }}>
        <Search size={14} color="var(--text-muted)" />
        <input
          placeholder="Search customers by name or @instagram handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div>
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} height="56px" className="mb-2" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} color="var(--text-muted)" style={{ marginBottom: "16px" }} />
          <h3 className="h2" style={{ fontSize: "16px", marginBottom: "12px", color: "var(--text-primary)" }}>No customers found</h3>
          <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Customer profiles are generated automatically when you log Instagram orders.
          </p>
          <Link to="/orders">
            <Button style={{ background: "var(--accent)", color: "white" }}>
              <ShoppingBag size={16} />
              Create First Order
            </Button>
          </Link>
        </div>
      ) : (
        <div className="table-shell" style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 0" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                <th className="caption" style={{ padding: "12px 16px" }}>Customer Name</th>
                <th className="caption" style={{ padding: "12px 16px" }}>Orders Logged</th>
                <th className="caption" style={{ padding: "12px 16px" }}>Total Cash Spent</th>
                <th className="caption" style={{ padding: "12px 16px" }}>Status</th>
                <th className="caption" style={{ padding: "12px 16px" }}>Last Order Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr
                  key={customer.name}
                  onClick={() => setSelected(customer)}
                  style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>{customer.name}</div>
                    {customer.ig_username && (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "2px", marginTop: "2px" }}>
                        <AtSign size={9} />
                        {customer.ig_username}
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>{customer.orders.length}</td>
                  <td className="mono" style={{ padding: "14px 16px", fontWeight: "600", color: "var(--text-primary)" }}>
                    Rs {customer.totalSpent.toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {customer.pendingDelivery > 0 ? (
                      <Badge status="warning">{customer.pendingDelivery} pending</Badge>
                    ) : (
                      <Badge status="success">Clear</Badge>
                    )}
                  </td>
                  <td className="body" style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
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

      {/* Customer profile modal */}
      <AnimatePresence>
        {selected && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-backdrop"
              onClick={() => setSelected(null)}
              style={{ background: "rgba(35,30,28,0.3)" }}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="modal-panel"
              style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)", background: "var(--surface)", borderRadius: "var(--radius-lg)", padding: "28px" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <h2 className="h2" style={{ fontSize: "18px", fontWeight: "750", color: "var(--text-primary)", margin: 0 }}>{selected.name}</h2>
                  {selected.ig_username && (
                    <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px", marginTop: "4px" }}>
                      <AtSign size={11} /> {selected.ig_username}
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => setSelected(null)} className="icon-btn" aria-label="Close modal">
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
                <div className="stat-card stat-card--compact" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", padding: "10px", borderRadius: "var(--radius-md)" }}>
                  <div className="caption" style={{ color: "var(--text-muted)" }}>Orders</div>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary)", marginTop: "2px" }}>{selected.orders.length}</div>
                </div>
                <div className="stat-card stat-card--compact" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", padding: "10px", borderRadius: "var(--radius-md)" }}>
                  <div className="caption" style={{ color: "var(--text-muted)" }}>Spent</div>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--success)", marginTop: "2px" }}>Rs {selected.totalSpent.toLocaleString()}</div>
                </div>
                <div className="stat-card stat-card--compact" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)", padding: "10px", borderRadius: "var(--radius-md)" }}>
                  <div className="caption" style={{ color: "var(--text-muted)" }}>Paid</div>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary)", marginTop: "2px" }}>{selected.paidCount}</div>
                </div>
              </div>

              <div className="caption" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "10px", color: "var(--text-secondary)" }}>Purchase History Ledger</div>
              <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selected.orders.map((o) => (
                  <div key={o.id} className="activity-row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" }}>{o.product_name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "2px" }}><Calendar size={11} /> {new Date(o.order_date).toLocaleDateString()}</span>
                        <span>·</span>
                        <span style={{ fontWeight: "600", color: o.payment_status === "paid" ? "var(--success)" : "var(--error)" }}>{o.payment_status.toUpperCase()}</span>
                        <span>·</span>
                        <span style={{ fontWeight: "600", color: o.delivery_status === "delivered" ? "var(--success)" : "var(--warning)" }}>{o.delivery_status.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="mono" style={{ fontWeight: "700", fontSize: "13px", color: "var(--text-primary)" }}>Rs {o.price.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={() => setSelected(null)}>Close Profile</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
