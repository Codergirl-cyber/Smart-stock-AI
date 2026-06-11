import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./hooks/useAuth";
import { Skeleton } from "./components/UI";
import { ArrowUpRight, ArrowDownLeft, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "./hooks/useToast";

export default function TransactionsPage() {
    const { showToast } = useToast();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all, success, failed, pending
    const [updating, setUpdating] = useState(null); // Track which transaction is being updated

    const fetchTransactions = useCallback(async () => {
        await Promise.resolve();

        if (!user) {
            setTransactions([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch {
            setTransactions([]);
            showToast("Could not load transactions.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        if (!user) return;
        const timer = window.setTimeout(() => {
            fetchTransactions();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [user, fetchTransactions]);

    const updateTransactionStatus = async (txnId, newStatus) => {
        try {
            setUpdating(txnId);
            if (!user) {
                showToast("Please log in to update transactions", "error");
                return;
            }

            const { data, error } = await supabase
                .from("transactions")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", txnId)
                .eq("user_id", user.id)
                .select();

            if (error) {
                console.error("Supabase error:", error);
                throw new Error(error.message);
            }
            
            setTransactions(prev => prev.map(t => 
                t.id === txnId ? { ...t, status: newStatus } : t
            ));
            showToast("Transaction status updated.", "success");
            if (!data?.length) await fetchTransactions();
        } catch (err) {
            console.error("Error updating transaction:", err.message || err);
            showToast(err.message || "Failed to update status.", "error");
        } finally {
            setUpdating(null);
        }
    };

    const totalInflow = transactions.filter(t => t.type === "sale" || t.type === "credit").reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalOutflow = transactions.filter(t => t.type === "refund").reduce((acc, t) => acc + (t.amount || 0), 0);

    const filtered = transactions.filter(t => {
        const matchesSearch = (t.order_id?.toLowerCase?.().includes(search.toLowerCase()) || false) || 
                              (t.id?.toLowerCase?.().includes(search.toLowerCase()) || false);
        const matchesStatus = statusFilter === "all" || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Helper function to get status info
    const getStatusInfo = (status) => {
        const statusMap = {
            success: { color: "var(--success)", icon: CheckCircle, label: "Success", bg: "rgba(34, 197, 94, 0.08)" },
            failed: { color: "var(--error)", icon: XCircle, label: "Failed", bg: "rgba(239, 68, 68, 0.08)" },
            pending: { color: "var(--warning)", icon: Clock, label: "Pending", bg: "rgba(234, 179, 8, 0.08)" }
        };
        return statusMap[status] || statusMap.pending;
    };

    // Count transactions by status
    const successCount = transactions.filter(t => t.status === "success").length;
    const failedCount = transactions.filter(t => t.status === "failed").length;
    const pendingCount = transactions.filter(t => t.status === "pending").length;

    return (
        <div className="page-shell">
            <header style={{ marginBottom: "56px" }}>
                <h1 className="h1">Transactions</h1>
                <p className="subheading" style={{ marginTop: "8px" }}>Historical ledger of store cash flow.</p>
            </header>

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

            <div className="premium-search">
                <Search size={14} color="var(--text-muted)" />
                <input 
                    placeholder="Search ledger..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ background: "transparent", border: "none", color: "var(--text-primary)", outline: "none", fontSize: "14px", flex: 1, fontFamily: "var(--font-sans)" }}
                />
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", marginTop: "24px" }}>
                {[
                    { id: "all", label: "All" },
                    { id: "success", label: `Success (${successCount})`, color: "var(--success)" },
                    { id: "failed", label: `Failed (${failedCount})`, color: "var(--error)" },
                    { id: "pending", label: `Pending (${pendingCount})`, color: "var(--warning)" }
                ].map(btn => (
                    <button
                        key={btn.id}
                        onClick={() => setStatusFilter(btn.id)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: "var(--radius-md)",
                            border: statusFilter === btn.id ? `2px solid ${btn.color || "var(--accent)"}` : "1px solid var(--border)",
                            background: statusFilter === btn.id ? (btn.color ? `${btn.color}10` : "var(--accent-soft)") : "var(--surface)",
                            color: statusFilter === btn.id ? (btn.color || "var(--accent)") : "var(--text-secondary)",
                            fontSize: "13px",
                            fontWeight: statusFilter === btn.id ? "600" : "500",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
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
                            ? "Transactions appear when orders are processed through your store."
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
                            <td style={{ padding: "20px 0" }}><Skeleton width="60px" height="12px" /></td>
                            <td style={{ padding: "20px 0" }}><Skeleton width="80px" height="12px" /></td>
                            <td style={{ padding: "20px 0" }}><Skeleton width="70px" height="12px" /></td>
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
                                    <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>Updating...</div>
                                ) : (
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: statusInfo.color, fontSize: "12px", fontWeight: "600", background: statusInfo.bg, padding: "4px 8px", borderRadius: "4px", minWidth: "80px" }}>
                                            <StatusIcon size={13} />
                                            {statusInfo.label}
                                        </div>
                                        {/* Dropdown to change status for all transactions */}
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
                                                transition: "all 0.2s ease"
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
