import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Input } from "./components/UI";
import { User, Lock, Bell, ChevronRight, Save, Moon, Sun, AlertTriangle } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { supabase } from "./supabase";
import { clearOrdersCache } from "./services/ordersCache";
import { clearProductsCache } from "./services/productsCache";
import { clearTxnsCache } from "./services/transactionsCache";
import { clearDashboardCache } from "./services/dashboardCache";

const SettingsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [storeInfo, setStoreInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('store_settings:v1');
      const base = saved ? JSON.parse(saved) : {};
      return {
        name: base.name || 'My Instagram Shop',
        email: base.email || '',
        currency: base.currency || 'INR (Rs)',
      };
    } catch {
      return { name: 'My Instagram Shop', email: '', currency: 'INR (Rs)' };
    }
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: isDark ? Moon : Sun },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  const handleSave = () => {
    localStorage.setItem('store_settings:v1', JSON.stringify(storeInfo));
    showToast('Store settings saved.', 'success');
  };

  const handleResetAllData = async () => {
    if (resetInput.toLowerCase() !== "reset") return;
    if (!user?.id) {
      showToast("User session not found.", "error");
      return;
    }

    setResetting(true);
    try {
      // 1. Delete transactions first due to FK constraints
      const { error: txnsErr } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", user.id);
      if (txnsErr) throw txnsErr;

      // 2. Delete orders
      const { error: ordersErr } = await supabase
        .from("orders")
        .delete()
        .eq("user_id", user.id);
      if (ordersErr) throw ordersErr;

      // 3. Delete products
      const { error: productsErr } = await supabase
        .from("products")
        .delete()
        .eq("user_id", user.id);
      if (productsErr) throw productsErr;

      // 4. Clear all local storage caches
      clearOrdersCache(user.id);
      clearProductsCache(user.id);
      clearTxnsCache(user.id);
      clearDashboardCache(user.id);

      // 5. Trigger event to reload dashboard/etc.
      try {
        window.dispatchEvent(new Event("sellersync-data-changed"));
      } catch (err) {
        console.warn("Event dispatch failed", err);
      }

      showToast("All store data reset successfully.", "success");
      setShowResetConfirm(false);
      setResetInput("");
      setActiveTab("profile");
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to reset data. Please try again.", "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="page-shell settings-page">
      <header style={{ marginBottom: "var(--space-12)" }}>
        <h1 className="h1">Settings</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>Manage your store profile and account preferences.</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'settings-nav__item is-active' : 'settings-nav__item'}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <tab.icon size={16} style={{ color: tab.id === 'danger' ? 'var(--error)' : 'inherit' }} />
                <span style={{ color: tab.id === 'danger' ? 'var(--error)' : 'inherit', fontWeight: tab.id === 'danger' ? '600' : 'normal' }}>{tab.label}</span>
              </div>
              {activeTab === tab.id && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && (
              <Card>
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "var(--space-8)" }}>Store Profile</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: "480px" }}>
                  <Input label="Store Name" value={storeInfo.name} onChange={e => setStoreInfo(p => ({ ...p, name: e.target.value }))} />
                  <Input label="Contact Email" value={storeInfo.email || user?.email || ''} onChange={e => setStoreInfo(p => ({ ...p, email: e.target.value }))} />
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase" }}>Currency</label>
                    <select value={storeInfo.currency} onChange={e => setStoreInfo(p => ({ ...p, currency: e.target.value }))} style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px", color: "var(--text-primary)", outline: "none" }}>
                      <option>INR (Rs)</option>
                      <option>USD ($)</option>
                    </select>
                  </div>
                  <p className="body" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Signed in as <strong>{user?.email}</strong>
                  </p>
                  <Button onClick={handleSave} style={{ alignSelf: "start", marginTop: "var(--space-4)" }}>
                    <Save size={16} />
                    Save Changes
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card>
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "var(--space-4)" }}>Appearance</h2>
                <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", maxWidth: "420px" }}>
                  Choose how SellerSync looks on your device. Your preference is saved locally.
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Button
                    variant={theme === 'light' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={16} />
                    Light ☀️
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={16} />
                    Dark 🌙
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "var(--space-4)" }}>Security</h2>
                <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", maxWidth: "420px" }}>
                  Reset your password via email. You will receive a secure link from Supabase Auth.
                </p>
                <Link to="/forgot-password">
                  <Button variant="secondary">Send password reset email</Button>
                </Link>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card style={{ padding: "var(--space-8)" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "var(--space-4)" }}>Notifications</h2>
                <p className="body" style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                  Email alerts for pending orders and low stock are planned for a future release. Your in-app dashboard already highlights overdue deliveries.
                </p>
              </Card>
            )}

            {activeTab === 'danger' && (
              <Card>
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "var(--space-4)", color: "var(--error)" }}>Danger Zone</h2>
                <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)", maxWidth: "480px" }}>
                  Permanently delete all your orders, customers, transactions, and inventory. This action only affects data associated with your account and cannot be undone.
                </p>
                <Button
                  variant="danger"
                  onClick={() => setShowResetConfirm(true)}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid var(--error)",
                    color: "var(--error)"
                  }}
                >
                  <AlertTriangle size={16} />
                  Reset Store Data
                </Button>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!resetting) {
                  setShowResetConfirm(false);
                  setResetInput("");
                }
              }}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "480px",
                background: "var(--surface)",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                border: "1px solid var(--border)"
              }}
            >
              <h3 className="h2" style={{ color: "var(--error)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} />
                Are you absolutely sure?
              </h3>
              <p className="body" style={{ color: "var(--text-secondary)", marginBottom: "20px", fontSize: "14px" }}>
                This will delete all your <strong>orders</strong>, <strong>transactions</strong>, and <strong>products</strong> permanently. Your account will not be deleted, but your shop data will be completely wiped.
              </p>
              <p className="body" style={{ color: "var(--text-primary)", marginBottom: "12px", fontSize: "14px", fontWeight: "600" }}>
                Type <span style={{ color: "var(--error)", fontFamily: "monospace", padding: "2px 6px", background: "rgba(239, 68, 68, 0.08)", borderRadius: "4px" }}>reset</span> to confirm:
              </p>
              
              <Input
                placeholder="Type 'reset' here"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                style={{ marginBottom: "24px" }}
                disabled={resetting}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Button
                  variant="secondary"
                  disabled={resetting}
                  onClick={() => {
                    setShowResetConfirm(false);
                    setResetInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={resetInput.toLowerCase() !== "reset" || resetting}
                  onClick={handleResetAllData}
                  style={{
                    backgroundColor: resetInput.toLowerCase() === "reset" ? "var(--error)" : "var(--border)",
                    color: "white",
                    border: "none",
                    opacity: resetInput.toLowerCase() === "reset" ? 1 : 0.6,
                    cursor: resetInput.toLowerCase() === "reset" ? "pointer" : "not-allowed"
                  }}
                >
                  {resetting ? "Resetting..." : "Permanently Delete"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
