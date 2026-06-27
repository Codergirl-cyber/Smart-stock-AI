import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton } from "./components/UI";
import SyncBanner from "./components/SyncBanner";
import { ArrowUpRight, ArrowDownLeft, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "./hooks/useToast";
import {
  readTxnsCache,
  writeTxnsCache,
  touchTxnsCache,
  txnsAreEqual,
  stripEnrichmentFlags,
} from "./services/transactionsCache";

/**
 * Enrich transaction records by cross-referencing order data.
 *
 * Two enrichments happen:
 *  1. STATUS  — if the linked order is paid but the txn is still "pending",
 *               promote txn status to "success" (and vice-versa).
 *  2. AMOUNT  — if the DB stored amount as 0 or null but we have the linked
 *               order's price × quantity, recover the correct value.
 *
 * This is a UI-only enrichment (_enriched flag). The DB record is NOT
 * changed unless the user manually edits it via the dropdown.
 * _enriched is stripped before any cache write so it never causes false
 * SyncBanner triggers.
 */
function enrichWithOrderStatus(transactions, orders) {
  if (!orders || orders.length === 0) return transactions;
  const orderMap = {};
  orders.forEach(o => { orderMap[o.id] = o; });

  return transactions.map(txn => {
    if (!txn.order_id) return txn;
    const linkedOrder = orderMap[txn.order_id];
    if (!linkedOrder) return txn;

    let updated = { ...txn };
    let didEnrich = false;

    // Recover amount if the DB stored 0 or null
    const orderAmount = Number(linkedOrder.price || 0) * (Number(linkedOrder.quantity) || 1);
    if ((!updated.amount || updated.amount === 0) && orderAmount > 0) {
      updated.amount = orderAmount;
      didEnrich = true;
    }

    // Sync status with payment_status
    if (linkedOrder.payment_status === "paid" && updated.status === "pending") {
      updated.status = "success";
      didEnrich = true;
    } else if (linkedOrder.payment_status === "unpaid" && updated.status === "success") {
      updated.status = "pending";
      didEnrich = true;
    }

    if (didEnrich) updated._enriched = true;
    return updated;
  });
}

export default function TransactionsPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]); // used for enrichment
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [updating, setUpdating] = useState(null);

    // Sync-banner state
    const [staleBanner, setStaleBanner] = useState(false);
    const [applyingSyncData, setApplyingSyncData] = useState(false);
    const freshTxnsRef = useRef([]);
    const freshOrdersRef = useRef([]);

    // ─── Cache-first load ─────────────────────────────────────────────────────

    const loadFromCache = useCallback(() => {
        if (!user) return false;
        const cached = readTxnsCache(user.id);
        if (cached) {
            setTransactions(cached.transactions);
            setLoading(false);
            return true;
        }
        return false;
    }, [user]);

    /**
     * Background sync — fetch both transactions AND orders for enrichment.
     * @param {boolean} force — replace state immediately when true
     */
    const syncFromDB = useCallback(async (force = false) => {
        if (!user) return;

        try {
            // Fetch transactions and orders in parallel
            const [txnResult, ordResult] = await Promise.all([
                supabase
                    .from("transactions")
                    .select("*")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("orders")
                    // Include price + quantity so we can recover amount when DB stores 0
                    .select("id, payment_status, price, quantity")
                    .eq("user_id", user.id),
            ]);

            if (txnResult.error) throw txnResult.error;

            const freshTxns  = txnResult.data || [];
            const freshOrders = ordResult.data  || [];
            const enriched = enrichWithOrderStatus(freshTxns, freshOrders);
            // Always write clean (no _enriched) data to cache so equality
            // checks are never poisoned by UI-only annotations.
            const toCache = stripEnrichmentFlags(enriched);

            if (force) {
                setTransactions(enriched);   // show enriched in UI
                setOrders(freshOrders);
                writeTxnsCache(user.id, toCache);  // store clean in cache
                setStaleBanner(false);
                return;
            }

            const cached = readTxnsCache(user.id);
            if (cached && txnsAreEqual(cached.transactions, toCache)) {
                touchTxnsCache(user.id);
            } else if (!cached) {
                setTransactions(enriched);
                setOrders(freshOrders);
                writeTxnsCache(user.id, toCache);
            } else {
                // Store for banner — keep enriched for display, clean for cache
                freshTxnsRef.current   = enriched;
                freshOrdersRef.current = freshOrders;
                setStaleBanner(true);
            }
        } catch (err) {
            console.warn("[TransactionsPage] Background sync failed:", err.message);
        }
    }, [user]);

    // ─── Apply stale banner ───────────────────────────────────────────────────

    const handleApplySync = useCallback(async () => {
        setApplyingSyncData(true);
        if (freshTxnsRef.current.length > 0) {
            setTransactions(freshTxnsRef.current);
            setOrders(freshOrdersRef.current);
            // Strip enrichment flags before persisting
            writeTxnsCache(user.id, stripEnrichmentFlags(freshTxnsRef.current));
            freshTxnsRef.current   = [];
            freshOrdersRef.current = [];
            setStaleBanner(false);
            setApplyingSyncData(false);
        } else {
            await syncFromDB(true);
            setApplyingSyncData(false);
        }
    }, [user, syncFromDB]);

    // ─── Mount effect ─────────────────────────────────────────────────────────

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

    // ─── Update transaction status ────────────────────────────────────────────

    const updateTransactionStatus = async (txnId, newStatus) => {
        try {
            setUpdating(txnId);
            if (!user) { showToast("Please log in to update transactions", "error"); return; }

            // Optimistic update
            setTransactions(prev => {
                const updated = prev.map(t => t.id === txnId ? { ...t, status: newStatus } : t);
                writeTxnsCache(user.id, stripEnrichmentFlags(updated));
                return updated;
            });

            const { data, error } = await supabase
                .from("transactions")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", txnId)
                .eq("user_id", user.id)
                .select();

            if (error) {
                // Revert
                setTransactions(prev => {
                    const reverted = prev.map(t => t.id === txnId ? { ...t, status: t.status } : t);
                    writeTxnsCache(user.id, stripEnrichmentFlags(reverted));
                    return reverted;
                });
                throw new Error(error.message);
            }

            showToast("Transaction status updated.", "success");
            if (!data?.length) await syncFromDB(true);
        } catch (err) {
            console.error("Error updating transaction:", err.message || err);
            showToast(err.message || "Failed to update status.", "error");
        } finally {
            setUpdating(null);
        }
    };

    // ─── Derived values ───────────────────────────────────────────────────────

    // Compute inflow/outflow only from "success" or non-failed transactions so amounts are accurate
    const totalInflow = transactions
        .filter(t => (t.type === "sale" || t.type === "credit") && t.status !== "failed")
        .reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalOutflow = transactions
        .filter(t => t.type === "refund" && t.status !== "failed")
        .reduce((acc, t) => acc + (t.amount || 0), 0);

    const filtered = transactions.filter(t => {
        const search_lower = search.toLowerCase();
        const matchesSearch =
            (t.order_id?.toLowerCase?.().includes(search_lower) || false) ||
            (t.id?.toLowerCase?.().includes(search_lower) || false);
        const matchesStatus = statusFilter === "all" || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusInfo = (status) => {
        const statusMap = {
            success: { color: "var(--success)", icon: CheckCircle, label: "Success", bg: "rgba(34, 197, 94, 0.08)" },
            failed:  { color: "var(--error)",   icon: XCircle,     label: "Failed",  bg: "rgba(239, 68, 68, 0.08)" },
            pending: { color: "var(--warning)",  icon: Clock,       label: "Pending", bg: "rgba(234, 179, 8, 0.08)" },
        };
        return statusMap[status] || statusMap.pending;
    };

    const successCount = transactions.filter(t => t.status === "success").length;
    const failedCount  = transactions.filter(t => t.status === "failed").length;
    const pendingCount = transactions.filter(t => t.status === "pending").length;

    return (
        <div className="page-shell">
            <header style={{ marginBottom: "56px" }}>
                <h1 className="h1">Transactions</h1>
                <p className="subheading" style={{ marginTop: "8px" }}>Historical ledger of store cash flow.</p>
            </header>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px", marginBottom: "42px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "22px" }}>
                    <div className="caption" style={{ marginBottom: "12px" }}>Inflow</div>
                    <div className="h2" style={{ color: "var(--success)" }}>Rs {totalInflow.toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "22px" }}>
                    <div className="caption" style={{ marginBottom: "12px" }}>Outflow</div>
                    <div className="h2" style={{ color: "var(--error)" }}>Rs {totalOutflow.toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "22px" }}>
                    <div className="caption" style={{ marginBottom: "12px" }}>Net</div>
                    <div className="h2">Rs {(totalInflow - totalOutflow).toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "22px" }}>
                    <div className="caption" style={{ marginBottom: "12px", color: "var(--success)" }}>✓ Successful</div>
                    <div className="h2" style={{ color: "var(--success)" }}>{successCount}</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", padding: "22px" }}>
                    <div className="caption" style={{ marginBottom: "12px", color: "var(--error)" }}>✕ Failed</div>
                    <div className="h2" style={{ color: "var(--error)" }}>{failedCount}</div>
                </div>
            </div>

            {/* Sync Banner */}
            <SyncBanner
                visible={staleBanner}
                syncing={applyingSyncData}
                message="Transaction data has been updated — your view may be outdated."
                onApply={handleApplySync}
                onDismiss={() => setStaleBanner(false)}
            />

            <div className="premium-search">
                <Search size={14} color="var(--text-muted)" />
                <input
                    placeholder="Search by order ID or reference..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ background: "transparent", border: "none", color: "var(--text-primary)", outline: "none", fontSize: "14px", flex: 1, fontFamily: "var(--font-sans)" }}
                />
            </div>

            {/* Status filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", marginTop: "24px" }}>
                {[
                    { id: "all",     label: "All" },
                    { id: "success", label: `Success (${successCount})`, color: "var(--success)" },
                    { id: "failed",  label: `Failed (${failedCount})`,   color: "var(--error)" },
                    { id: "pending", label: `Pending (${pendingCount})`, color: "var(--warning)" },
                ].map(btn => (
                    <button
                        key={btn.id}
                        onClick={() => setStatusFilter(btn.id)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "var(--radius-md)",
                            border: statusFilter === btn.id ? `2px solid ${btn.color || "var(--accent)"}` : "1px solid var(--border)",
                            background: statusFilter === btn.id ? (btn.color ? `${btn.color}18` : "var(--accent-soft)") : "var(--surface)",
                            color: statusFilter === btn.id ? (btn.color || "var(--accent)") : "var(--text-secondary)",
                            fontSize: "13px",
                            fontWeight: statusFilter === btn.id ? "600" : "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {!loading && filtered.length === 0 ? (
                <div className="empty-state" style={{ marginTop: "24px" }}>
                    <p className="body" style={{ color: "var(--text-secondary)" }}>
                        {transactions.length === 0
                            ? "Transactions appear automatically when you create orders."
                            : "No transactions match your search or filter."}
                    </p>
                </div>
            ) : (
                <div className="table-shell">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                                <th className="caption" style={{ padding: "16px 0" }}>Reference</th>
                                <th className="caption" style={{ padding: "16px 0" }}>Type</th>
                                <th className="caption" style={{ padding: "16px 0" }}>Amount</th>
                                <th className="caption" style={{ padding: "16px 0" }}>Status</th>
                                <th className="caption" style={{ padding: "16px 0", textAlign: "right" }}>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array(8).fill(0).map((_, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "20px 0" }}><Skeleton width="120px" height="12px" /></td>
                                    <td style={{ padding: "20px 0" }}><Skeleton width="60px"  height="12px" /></td>
                                    <td style={{ padding: "20px 0" }}><Skeleton width="80px"  height="12px" /></td>
                                    <td style={{ padding: "20px 0" }}><Skeleton width="70px"  height="12px" /></td>
                                    <td style={{ padding: "20px 0", textAlign: "right" }}><Skeleton width="140px" height="12px" style={{ float: "right" }} /></td>
                                </tr>
                            )) : filtered.map((txn) => {
                                const statusInfo = getStatusInfo(txn.status || "pending");
                                const StatusIcon = statusInfo.icon;
                                return (
                                    <tr key={txn.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                        <td className="mono" style={{ padding: "20px 0", fontSize: "12px", color: "var(--text-muted)" }}>
                                            {txn.id.slice(0, 12).toUpperCase()}
                                        </td>
                                        <td style={{ padding: "20px 0" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: txn.type === "sale" || txn.type === "credit" ? "var(--success)" : "var(--error)", fontSize: "13px", fontWeight: "600" }}>
                                                {txn.type === "sale" || txn.type === "credit" ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                <span style={{ textTransform: "capitalize" }}>{txn.type}</span>
                                            </div>
                                        </td>
                                        <td className="mono" style={{ padding: "20px 0", fontWeight: "600" }}>
                                            {txn.type === "sale" || txn.type === "credit" ? "+" : "-"}Rs {Math.abs(txn.amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: "20px 0" }}>
                                            {updating === txn.id ? (
                                                <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>Updating…</div>
                                            ) : (
                                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: statusInfo.color, fontSize: "12px", fontWeight: "600", background: statusInfo.bg, padding: "4px 8px", borderRadius: "4px", minWidth: "80px" }}>
                                                        <StatusIcon size={13} />
                                                        {statusInfo.label}
                                                        {txn._enriched && (
                                                            <span title="Synced from order payment status" style={{ fontSize: "10px", opacity: 0.7, marginLeft: "2px" }}>↗</span>
                                                        )}
                                                    </div>
                                                    <select
                                                        value={txn.status || "pending"}
                                                        onChange={(e) => updateTransactionStatus(txn.id, e.target.value)}
                                                        style={{
                                                            padding: "6px 8px",
                                                            borderRadius: "4px",
                                                            border: "1px solid var(--border)",
                                                            background: "var(--surface)",
                                                            color: "var(--text-primary)",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s ease",
                                                        }}
                                                    >
                                                        <option value="pending">→ Pending</option>
                                                        <option value="success">✓ Success</option>
                                                        <option value="failed">✕ Failed</option>
                                                    </select>
                                                </div>
                                            )}
                                        </td>
                                        <td className="body" style={{ padding: "20px 0", textAlign: "right", color: "var(--text-muted)" }}>
                                            {new Date(txn.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
