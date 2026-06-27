import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

/**
 * SyncBanner
 *
 * A non-intrusive notification bar shown when the local cache differs from
 * the latest Supabase data. The user can choose to apply the update or dismiss.
 *
 * Props:
 *  - visible    {boolean}   Whether to render the banner
 *  - onApply    {function}  Called when the user clicks "Apply"
 *  - onDismiss  {function}  Called when the user clicks the X
 *  - message    {string}    Optional custom message
 *  - syncing    {boolean}   Shows a spinner while applying
 */
export default function SyncBanner({
  visible,
  onApply,
  onDismiss,
  message = "Newer data is available from the database.",
  syncing = false,
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sync-banner"
          initial={{ opacity: 0, y: -12, scaleY: 0.8 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -12, scaleY: 0.8 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "10px 18px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.10) 100%)",
            border: "1px solid rgba(99,102,241,0.35)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(99,102,241,0.10)",
          }}
        >
          {/* Left: icon + message */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
            <motion.div
              animate={syncing ? { rotate: 360 } : { rotate: 0 }}
              transition={syncing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
            >
              <RefreshCw
                size={15}
                style={{ color: "var(--accent)", flexShrink: 0 }}
              />
            </motion.div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "500",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {syncing ? "Applying latest data…" : message}
            </span>
          </div>

          {/* Right: actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            {!syncing && (
              <button
                type="button"
                onClick={onApply}
                style={{
                  padding: "5px 14px",
                  borderRadius: "7px",
                  border: "1px solid rgba(99,102,241,0.5)",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Apply Update
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              disabled={syncing}
              style={{
                background: "none",
                border: "none",
                cursor: syncing ? "default" : "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                padding: "4px",
                opacity: syncing ? 0.3 : 1,
                transition: "opacity 0.15s ease",
              }}
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
