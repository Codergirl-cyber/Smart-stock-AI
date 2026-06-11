import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Card, Button, Input } from "./components/UI";
import { User, Lock, Bell, ChevronRight, Save, Moon, Sun } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";

const SettingsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme, setTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [storeInfo, setStoreInfo] = useState(() => {
    try {
      const saved = localStorage.getItem('store_settings');
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

  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: isDark ? Moon : Sun },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const handleSave = () => {
    localStorage.setItem('store_settings', JSON.stringify(storeInfo));
    showToast('Store settings saved.', 'success');
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
                <tab.icon size={16} />
                <span>{tab.label}</span>
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsPage;
