import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SellerSyncLogo from "./components/SellerSyncLogo";
import { motion } from "framer-motion";

// ── Utility ──────────────────────────────────────────────────────────────────

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true);
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

function RippleButton({ children, onClick, style, className }) {
  const [ripples, setRipples] = useState([]);

  const triggerRipple = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = `${Date.now()}-${Math.random()}`;

    setRipples((prev) => [...prev, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== id));
    }, 650);

    onClick?.(event);
  };

  return (
    <motion.button
      className={className}
      onClick={triggerRipple}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.97 }}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ opacity: 0.35, scale: 0 }}
          animate={{ opacity: 0, scale: 2.8 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: ripple.x,
            top: ripple.y,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.35)",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      ))}
    </motion.button>
  );
}

// ── Micro sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data = [], color = "#6366f1", h = 24, w = 60 }) {
  const safe = Array.isArray(data) ? data : [];
  const max = Math.max(1, ...safe);
  const min = Math.min(0, ...safe);
  const range = Math.max(1, max - min);

  const points = safe.map((v, i) => {
    const x = (i / Math.max(1, safe.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  const line = points.length ? `M ${points.join(" L ")}` : "";
  const area = points.length
    ? `M ${points.join(" L ")} L ${w},${h} L 0,${h} Z`
    : "";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {area ? <path d={area} fill={`${color}22`} /> : null}
      {line ? (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

// ── Animated mesh background ──────────────────────────────────────────────────
function MeshBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "-20%", left: "20%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)", animation: "blob1 8s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", top: "10%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", animation: "blob2 10s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", bottom: "0%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", animation: "blob1 12s ease-in-out infinite alternate-reverse" }} />
      <div style={{ position: "absolute", top: "55%", right: "12%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.13) 0%, transparent 72%)", animation: "blob3 14s ease-in-out infinite alternate" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ── Dashboard preview ─────────────────────────────────────────────────────────
const revenueData = [42, 38, 55, 61, 58, 72, 68, 81, 77, 89, 95, 103];
const sellerRows = [
  { name: "TechBridge Co.", status: "active", sync: "2m ago", rev: "$14,820", chg: "+8.2%" },
  { name: "NovaSeller Ltd.", status: "active", sync: "4m ago", rev: "$9,340", chg: "+3.1%" },
  { name: "ArcMart Global", status: "syncing", sync: "now", rev: "$21,100", chg: "+12.4%" },
  { name: "PeakGoods Inc.", status: "active", sync: "12m ago", rev: "$6,780", chg: "-1.2%" },
  { name: "VaultShop EU", status: "warning", sync: "1h ago", rev: "$3,220", chg: "-4.8%" },
];
const statusColor = { active: { bg: "#dcfce7", text: "#16a34a" }, syncing: { bg: "#ede9fe", text: "#7c3aed" }, warning: { bg: "#fef3c7", text: "#d97706" } };

function DashboardPreview() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 2000); return () => clearInterval(id); }, []);
  const liveRev = (103200 + (tick % 4) * 847).toLocaleString();

  return (
    <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13 }}>
      {/* Top bar */}
      <div style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#aaa", maxWidth: 220, margin: "0 auto" }}>app.sellersync.io/dashboard</div>
      </div>

      <div style={{ display: "flex", height: 480 }}>
        {/* Sidebar */}
        <div style={{ width: 180, background: "#fafafa", borderRight: "1px solid #f0f0f0", padding: "16px 0", flexShrink: 0 }}>
          <div style={{ padding: "0 14px 12px", display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L6 11L12 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a", letterSpacing: "-0.3px" }}>SellerSync</span>
          </div>
          {[
            { icon: "▦", label: "Dashboard", active: true },
            { icon: "◎", label: "Sellers" },
            { icon: "⟳", label: "Sync" },
            { icon: "▤", label: "Inventory" },
            { icon: "∞", label: "Workflows" },
            { icon: "◈", label: "Analytics" },
          ].map(item => (
            <div key={item.label} style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, background: item.active ? "#ede9fe" : "transparent", margin: "1px 8px", borderRadius: 7, cursor: "pointer" }}>
              <span style={{ fontSize: 12, color: item.active ? "#7c3aed" : "#999" }}>{item.icon}</span>
              <span style={{ fontSize: 12, fontWeight: item.active ? 600 : 400, color: item.active ? "#7c3aed" : "#666" }}>{item.label}</span>
            </div>
          ))}
          <div style={{ margin: "16px 8px 0", padding: "10px 14px", background: "#fff0f0", borderRadius: 7 }}>
            <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>⚠ Alert</div>
            <div style={{ fontSize: 11, color: "#b91c1c", lineHeight: 1.4 }}>VaultShop EU sync delayed</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflow: "hidden", padding: 16 }}>
          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Total Revenue", value: `$${liveRev}`, chg: "+18.4%", up: true, data: revenueData },
              { label: "Active Sellers", value: "2,847", chg: "+32", up: true, data: [20,22,21,25,28,27,30,29,32,31,34,36] },
              { label: "Items Synced", value: "1.2M", chg: "+9.1%", up: true, data: [40,45,42,50,55,52,60,58,62,65,70,72] },
              { label: "Avg. Sync Time", value: "1.4s", chg: "-0.3s", up: true, data: [22,20,19,18,17,16,17,15,14,15,14,14] },
            ].map((m, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "11px 13px" }}>
                <div style={{ fontSize: 10, color: "#999", marginBottom: 4, fontWeight: 500, letterSpacing: "0.3px", textTransform: "uppercase" }}>{m.label}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#111", letterSpacing: "-0.5px", marginBottom: 4 }}>{m.value}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: m.up ? "#16a34a" : "#ef4444", fontWeight: 600 }}>{m.chg}</span>
                  <Sparkline data={m.data} color={i === 0 ? "#6366f1" : i === 1 ? "#8b5cf6" : i === 2 ? "#06b6d4" : "#10b981"} h={24} w={60} />
                </div>
              </div>
            ))}
          </div>

          {/* Chart + Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10, marginBottom: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Revenue Overview</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["7D","30D","90D","1Y"].map((t,i) => <div key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: i === 2 ? "#ede9fe" : "transparent", color: i === 2 ? "#7c3aed" : "#999", cursor: "pointer", fontWeight: i === 2 ? 600 : 400 }}>{t}</div>)}
                </div>
              </div>
              <svg viewBox="0 0 340 110" style={{ width: "100%", height: 100, overflow: "visible" }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {(() => {
                  const max = Math.max(...revenueData);
                  const pts = revenueData.map((v,i) => `${(i/(revenueData.length-1))*340},${110 - (v/max)*100}`);
                  const area = `M ${pts.join(" L ")} L 340,110 L 0,110 Z`;
                  const line = `M ${pts.join(" L ")}`;
                  return <>
                    <path d={area} fill="url(#revGrad)" />
                    <path d={line} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {revenueData.map((v,i) => <circle key={i} cx={(i/(revenueData.length-1))*340} cy={110-(v/max)*100} r={i===revenueData.length-1?4:0} fill="#6366f1" />)}
                  </>;
                })()}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => <div key={m} style={{ fontSize: 9, color: "#bbb" }}>{m}</div>)}
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111", marginBottom: 10 }}>By Platform</div>
              {[
                { name: "Amazon", pct: 42, color: "#f59e0b" },
                { name: "Shopify", color: "#10b981", pct: 28 },
                { name: "eBay", color: "#6366f1", pct: 18 },
                { name: "Others", color: "#e2e8f0", pct: 12 },
              ].map(p => (
                <div key={p.name} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666", marginBottom: 3 }}>
                    <span>{p.name}</span><span style={{ fontWeight: 600, color: "#333" }}>{p.pct}%</span>
                  </div>
                  <div style={{ background: "#f5f5f5", borderRadius: 4, height: 5 }}>
                    <div style={{ background: p.color, height: "100%", borderRadius: 4, width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sellers table */}
          <div style={{ background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #f8f8f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Recent Activity</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#6366f1", fontWeight: 600 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
                Live
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["Seller","Status","Last Sync","Revenue","Change"].map(h => <th key={h} style={{ padding: "7px 14px", fontSize: 10, fontWeight: 600, color: "#999", textAlign: "left", letterSpacing: "0.3px", textTransform: "uppercase" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sellerRows.map((r, i) => (
                  <tr key={r.name} style={{ borderTop: "1px solid #f8f8f8", background: i === 2 ? "#fafffe" : "transparent" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 500, color: "#222", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `hsl(${i*60},60%,88%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: `hsl(${i*60},50%,40%)` }}>{r.name[0]}</div>
                        {r.name}
                      </div>
                    </td>
                    <td style={{ padding: "8px 14px" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: statusColor[r.status].bg, color: statusColor[r.status].text }}>
                        {r.status === "syncing" ? "⟳ " : ""}{r.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", fontSize: 11, color: "#999" }}>{r.sync}</td>
                    <td style={{ padding: "8px 14px", fontWeight: 600, color: "#111", fontSize: 12 }}>{r.rev}</td>
                    <td style={{ padding: "8px 14px", fontSize: 11, fontWeight: 600, color: r.chg.startsWith("+") ? "#16a34a" : "#ef4444" }}>{r.chg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mini hero mockup (inline HTML/CSS) ───────────────────────────────────────
function MiniDashboardMock() {
  return (
    <div className="mini-mock-root" style={{ width: 'min(86vw,760px)', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .mini-mock-frame { transition: all 0.22s ease; }
        .mini-grid { transition: all 0.22s ease; }
        .mini-stats-grid { transition: all 0.18s ease; }
        @media (max-width: 720px) {
          .mini-mock-root { width: 94vw !important; }
          .mini-mock-frame { width: calc(94vw - 24px) !important; height: auto !important; border-radius: 14px !important; }
          .mini-grid { grid-template-columns: 1fr !important; }
          .mini-side { order: 2 !important; }
          .mini-main { order: 1 !important; }
          .mini-stats-grid { grid-template-columns: repeat(3,1fr) !important; gap: 8px !important; }
          .mini-sales-chart { height: 56px !important; }
        }
        @media (max-width: 420px) {
          .mini-stats-grid { grid-template-columns: 1fr !important; }
          .mini-mock-frame { padding: 8px !important; }
          .mini-recent-table td { padding: 6px 4px !important; font-size: 12px !important; }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: [0, -8, 0], rotate: [0, 0.35, 0] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        className="mini-mock-frame"
        style={{ width: 760, height: 440, borderRadius: 20, background: 'linear-gradient(180deg, rgba(250,250,255,0.95), rgba(245,243,255,0.9))', boxShadow: '0 22px 60px rgba(15,23,42,0.10)', border: '1px solid rgba(124,58,237,0.06)', overflow: 'hidden', transformStyle: 'preserve-3d', position: 'relative', backdropFilter: 'saturate(150%) blur(8px)' }}
      >
        {/* top browser bar */}
        <div style={{ height: 40, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(250,250,255,0.4))', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ff5f57' }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#febc2e' }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#28c840' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'center', color: '#777', fontSize: 12 }}>app.sellersync.io • demo</div>
        </div>

        <div className="mini-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, padding: 14 }}>
          <div className="mini-main" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="mini-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 12, padding: 14, boxShadow: 'inset 0 -6px 18px rgba(99,102,241,0.02)' }}>
                <div style={{ fontSize: 12, color: '#7b7f8a', fontWeight: 700 }}>Total Orders</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0b1220' }}>8,412</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 800 }}>+6.8%</span>
                  <Sparkline data={[20,22,21,25,28,27,30,29,32]} color="#6366f1" h={22} w={72} />
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: '#7b7f8a', fontWeight: 700 }}>Revenue</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0b1220' }}>$92,300</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 800 }}>+12.3%</span>
                  <Sparkline data={revenueData.slice(-9)} color="#8b5cf6" h={22} w={72} />
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.86)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: '#7b7f8a', fontWeight: 700 }}>Inventory</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0b1220' }}>42,102</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 800 }}>-2.1%</span>
                  <Sparkline data={[45,44,42,41,40,39,38,37,36]} color="#06b6d4" h={22} w={72} />
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 12, padding: 12, height: 160, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Sales (30d)</div>
                <div style={{ fontSize: 11, color: '#888' }}>sparkline</div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="mini-sales-chart" viewBox="0 0 300 80" style={{ width: '100%', height: 68 }}>
                  {(() => {
                    const data = revenueData.slice(-12);
                    const max = Math.max(...data);
                    const pts = data.map((v,i) => `${(i/(data.length-1))*300},${80-(v/max)*62}`);
                    const line = `M ${pts.join(' L ')}`;
                    const area = `M ${pts.join(' L ')} L 300,80 L 0,80 Z`;
                    return (
                      <>
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.12"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></linearGradient>
                        </defs>
                        <path d={area} fill="url(#g1)" />
                        <path d={line} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a8f99' }}>
                <div>Last 30 days</div>
                <div style={{ fontWeight: 800, color: '#0b1220' }}>$92,300</div>
              </div>
            </div>
          </div>

          <div className="mini-side" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.94)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>AI Insights</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Reorder 12 SKUs within 7 days to avoid stockouts.</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 12, padding: 8, overflow: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Recent Orders</div>
              <table className="mini-recent-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {sellerRows.slice(0,4).map((r,i) => (
                    <tr key={r.name} style={{ borderTop: '1px solid rgba(18,18,20,0.03)' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{r.name.split(' ')[0]}</td>
                      <td style={{ padding: '8px 6px', color: '#666' }}>{r.rev}</td>
                      <td style={{ padding: '8px 6px', color: r.chg.startsWith('+') ? '#16a34a' : '#ef4444', fontWeight: 700 }}>{r.chg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'rgba(255,250,240,0.98)', borderRadius: 12, padding: 12, border: '1px solid rgba(249,205,178,0.6)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>Low stock</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>3 SKUs below reorder point — prioritize restock.</div>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', right: -18, bottom: -28, transform: 'rotate(-6deg)', width: 120, height: 80, borderRadius: 12, background: 'linear-gradient(90deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))', filter: 'blur(16px)', opacity: 0.9 }} />
      </motion.div>
    </div>
  );
}

// ── Bento card ────────────────────────────────────────────────────────────────


// ── Section reveal wrapper ────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ scrolled, activeSection, onScrollTo }) {
  const navigate = useNavigate();

  const links = [
    { id: "product", label: "Product" },
    { id: "pricing", label: "Pricing" },
    { id: "integrations", label: "Integrations" },
    { id: "docs", label: "Docs" },
  ];

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.72)" : "transparent",
      backdropFilter: scrolled ? "saturate(180%) blur(8px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
      transition: "all 0.28s",
      boxShadow: scrolled ? "0 6px 30px rgba(18,18,20,0.04)" : "none",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L7 12L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
            <SellerSyncLogo size={32} variant="compact" />
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {links.map(l => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => { e.preventDefault(); onScrollTo && onScrollTo(l.id); }}
              style={{
                fontSize: 14,
                color: activeSection === l.id ? "#111" : "#555",
                fontWeight: activeSection === l.id ? 700 : 500,
                textDecoration: "none",
                position: "relative",
                padding: "6px 0",
                transition: "color 0.18s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#111"}
              onMouseLeave={e => e.currentTarget.style.color = activeSection === l.id ? "#111" : "#555"}
            >
              {l.label}
              {activeSection === l.id ? <span style={{ display: "block", height: 3, width: 32, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 3, marginTop: 6 }} /> : null}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a
            href="/login"
            style={{ fontSize: 14, color: "#555", fontWeight: 500, textDecoration: "none", padding: "8px 14px" }}
            onClick={(e) => { e.preventDefault(); navigate("/login"); }}
          >
            Sign in
          </a>
          <RippleButton
            style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "9px 20px", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", transition: "all 0.2s" }}
            onClick={() => navigate("/dashboard")}
          >
            Get started →
          </RippleButton>
        </div>
      </div>
    </nav>
  );
}

// ── Pricing card ──────────────────────────────────────────────────────────────


// ── Main page ─────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("product");

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    // observe sections with data-nav to update activeSection
    const els = Array.from(document.querySelectorAll('section[data-nav]'));
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible && visible.target.dataset && visible.target.dataset.nav) {
        setActiveSection(visible.target.dataset.nav);
      }
    }, { threshold: [0.35, 0.5, 0.75] });
    els.forEach(e => obs.observe(e));
    return () => obs.disconnect();
  }, []);

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72; // offset for navbar
    window.scrollTo({ top, behavior: 'smooth' });
  }


  return (
    <div style={{ background: "#fafafa", fontFamily: "system-ui, -apple-system, 'Inter', sans-serif", color: "#111", minHeight: "100vh" }}>
      <style>{`
        @keyframes blob1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,30px) scale(1.1); } }
        @keyframes blob2 { from { transform: translate(0,0) scale(1.05); } to { transform: translate(-30px,20px) scale(0.95); } }
        @keyframes blob3 { from { transform: translate(0,0) scale(1); } to { transform: translate(-18px,-14px) scale(1.08); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafafa; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
      `}</style>

      <Navbar scrolled={scrolled} activeSection={activeSection} onScrollTo={scrollToSection} />

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "128px 24px 84px", overflow: "hidden", background: "radial-gradient(ellipse at top, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.97) 42%, rgba(245,243,255,0.82) 100%)" }}>
        <MeshBg />
        <div style={{ position: "absolute", inset: "8% auto auto 50%", transform: "translateX(-50%)", width: "min(78vw, 980px)", height: "min(78vw, 980px)", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0.06) 34%, transparent 72%)", filter: "blur(8px)", pointerEvents: "none", zIndex: 0 }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 1280, margin: "0 auto", padding: "0 24px", width: "100%" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.82)", border: "1px solid rgba(124,58,237,0.16)", borderRadius: 999, padding: "9px 18px", marginBottom: 28, boxShadow: "0 12px 38px rgba(24,24,27,0.06)", backdropFilter: "blur(10px)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 0 6px rgba(124,58,237,0.12)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#4c1d95" }}>Inventory + Orders + Customers</span>
              <span style={{ fontSize: 13, color: "#7c3aed", fontWeight: 700 }}>with AI insights</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.08, ease: "easeOut" }} style={{ position: "relative", fontSize: "clamp(42px,7vw,86px)", fontWeight: 900, letterSpacing: "-3px", lineHeight: 1.02, color: "#0a0a0a", marginBottom: 20, maxWidth: 980, marginLeft: "auto", marginRight: "auto" }}>
            <span style={{ position: "absolute", inset: "-8% 6% auto", height: "54%", background: "radial-gradient(circle, rgba(99,102,241,0.20) 0%, rgba(99,102,241,0.04) 58%, transparent 100%)", filter: "blur(18px)", zIndex: -1 }} />
            Run your store,<br />
            <span style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>without the chaos.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16, ease: "easeOut" }} style={{ fontSize: "clamp(16px,2vw,20px)", color: "#666", maxWidth: 700, margin: "0 auto 30px", lineHeight: 1.75, fontWeight: 400 }}>
            Add products and orders manually, manage customers from one dashboard, and automatically reduce inventory when orders ship—then use AI to spot what to restock, what’s best-performing, and how your sales trend.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
            <RippleButton
              style={{ fontSize: 16, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 14, padding: "15px 30px", cursor: "pointer", boxShadow: "0 12px 34px rgba(99,102,241,0.32)", transition: "transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease", willChange: "transform" }}
              onClick={() => navigate("/signup")}
            >
              Get Started →
            </RippleButton>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.24, ease: "easeOut" }} style={{ animation: "float 6.5s ease-in-out infinite", maxWidth: 980, margin: "0 auto" }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
              <MiniDashboardMock />
            </div>
          </motion.div>
        </div>
      </section>


      {/* ── Problem ── */}
      <section style={{ padding: "72px 24px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.00) 60%)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>The problem</div>
              <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.08, color: "#111", marginBottom: 14 }}>
                Managing inventory manually is messy—
                <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>and it shows up as stockouts.</span>
              </h2>
              <p style={{ fontSize: 17, color: "#6b7280", lineHeight: 1.7, maxWidth: 620, fontWeight: 450 }}>
                When products, orders, and customers live in different places, it’s easy to oversell, lose track of what shipped, and miss the signals that tell you what to restock next.
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #eae7ff", borderRadius: 20, padding: 18, boxShadow: "0 18px 60px rgba(99,102,241,0.10)" }}>
              <div style={{ fontWeight: 900, color: "#111", fontSize: 15, marginBottom: 10 }}>What you get wrong most often</div>
              {[
                { t: "Inventory isn’t updated when orders ship", c: "#7c3aed" },
                { t: "Transactions get scattered and hard to audit", c: "#6366f1" },
                { t: "You don’t know what to reorder until it’s too late", c: "#8b5cf6" },
              ].map((x) => (
                <div key={x.t} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(99,102,241,0.10)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: x.c, marginTop: 6, boxShadow: `0 0 0 6px ${x.c}18` }} />
                  <div style={{ fontSize: 14, color: "#111", fontWeight: 600, lineHeight: 1.5 }}>{x.t}</div>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 12, color: "#7a6a90", fontWeight: 650 }}>SellerSync keeps everything in sync from one dashboard.</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "40px 24px 84px", maxWidth: 1280, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>How SellerSync works</div>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)", fontWeight: 900, letterSpacing: "-2px", color: "#111", marginBottom: 14 }}>A workflow built for real sellers</h2>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>3–4 steps that match how you actually run your business—without the generic SaaS feel.</p>
          </div>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}
        >
          {[
            {
              title: "Add products",
              desc: "Manually create and keep your product catalog organized, with clear inventory visibility.",
              icon: "▦",
            },
            {
              title: "Track orders",
              desc: "Add orders and manage them from one place with customer context attached.",
              icon: "◴",
            },
            {
              title: "Ship → auto updates",
              desc: "When an order ships, inventory is reduced automatically—so you can stop overselling.",
              icon: "⟳",
            },
            {
              title: "Use AI insights",
              desc: "Get recommendations like restocking needs, best-performing products, sales trends, and inventory health.",
              icon: "✦",
            },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              variants={fadeUp}
              custom={i * 0.05}
              whileHover={{ y: -6, scale: 1.01, boxShadow: "0 20px 60px rgba(99,102,241,0.12)" }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ background: "#fff", border: "1px solid #ededed", borderRadius: 20, padding: 18, boxShadow: "0 10px 40px rgba(99,102,241,0.08)" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 16, background: `linear-gradient(135deg, rgba(99,102,241,${0.22}), rgba(139,92,246,${0.18}))`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, border: "1px solid rgba(99,102,241,0.18)" }}>
                <span style={{ fontWeight: 900, color: "#6366f1", fontSize: 18 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#111", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{s.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Core Features ── */}
      <section data-nav="product" style={{ padding: "76px 24px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(99,102,241,0.00) 65%)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>Core features</div>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)", fontWeight: 900, letterSpacing: "-2px", color: "#111", marginBottom: 14 }}>Everything you need to manage inventory and sales</h2>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>Designed for small businesses that don’t want their operations to be a full-time job.</p>
          </div>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}
        >
          {[
            { title: "Inventory Management", desc: "Products you can trust—with inventory visibility that stays current.", icon: "▤" },
            { title: "Order Tracking", desc: "Manage orders in one dashboard with customer context.", icon: "◈" },
            { title: "Customer Management", desc: "Keep customer records organized and easy to reference.", icon: "◎" },
            { title: "Automatic Stock Updates", desc: "When an order ships, inventory is automatically reduced.", icon: "⟳" },
            { title: "Transaction History", desc: "Record transactions so you can review activity and audit quickly.", icon: "∞" },
            { title: "AI Insights", desc: "Restocking needs, best-performing products, sales trends, and inventory health.", icon: "✦" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i * 0.05}
              whileHover={{ y: -6, scale: 1.01, boxShadow: "0 20px 60px rgba(99,102,241,0.1)" }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ background: "#fff", border: "1px solid #ededed", borderRadius: 20, padding: 18, boxShadow: "0 10px 40px rgba(99,102,241,0.06)" }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 44, height: 44, borderRadius: 16, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#7c3aed", fontWeight: 900, fontSize: 18 }}>{f.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#111", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
      
      {/* ── Pricing (anchor) ── */}
      <section data-nav="pricing" style={{ padding: "60px 24px", maxWidth: 920, margin: "40px auto", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>Pricing</div>
        <h2 style={{ fontSize: "clamp(22px,3.2vw,36px)", fontWeight: 900, color: "#111", marginBottom: 18 }}>Simple pricing that scales with your business</h2>
        <p style={{ color: "#6b7280", maxWidth: 720, margin: "0 auto 22px" }}>Choose a plan that fits your seller volume. No surprises, monthly or annual billing.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 18 }}>
          {[
            { name: "Starter", price: "$19/mo", desc: "Up to 500 orders/month" },
            { name: "Growth", price: "$79/mo", desc: "Up to 10k orders/month" },
            { name: "Pro", price: "$249/mo", desc: "Unlimited orders + priority support" },
          ].map(p => (
            <div key={p.name} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#111", marginBottom: 8 }}>{p.price}</div>
              <div style={{ color: "#6b7280", marginBottom: 12 }}>{p.desc}</div>
              <button style={{ marginTop: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }} onClick={() => navigate('/signup')}>Start trial</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dashboard Preview ── */}
      <section style={{ padding: "0 24px 84px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.95fr", gap: 18, alignItems: "center" }}>

          <Reveal>
            <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(99,102,241,0.14)", boxShadow: "0 30px 90px rgba(99,102,241,0.10)" }}>
              <DashboardPreview />
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>Your dashboard</div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,46px)", fontWeight: 900, letterSpacing: "-2px", color: "#111", marginBottom: 14 }}>One view of orders, customers, and inventory health</h2>
              <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, marginBottom: 18 }}>
                Track sales activity, see which products need restocking, and understand inventory health without juggling spreadsheets.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                {[
                  { t: "Inventory health", d: "Understand what’s safe, low, and at risk." },
                  { t: "What to restock", d: "AI flags products that need replenishment." },
                  { t: "Sales trends", d: "Spot patterns and changes over time." },
                ].map((x, i) => (
                  <div key={x.t} style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.14)", borderRadius: 18, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "#111", marginBottom: 6 }}> {x.t}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{x.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      
        {/* ── Integrations (anchor) ── */}
        <section data-nav="integrations" style={{ padding: "54px 24px", maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>Integrations</div>
          <h2 style={{ fontSize: "clamp(24px,3.4vw,40px)", fontWeight: 900, color: "#111", marginBottom: 10 }}>Works with the platforms you already sell on</h2>
          <p style={{ color: "#6b7280", maxWidth: 720, margin: "0 auto 22px" }}>Connect marketplaces and storefronts to keep inventory and orders in sync.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 18, flexWrap: "wrap" }}>
            {[
              { name: "Amazon", logo: null },
              { name: "Shopify", logo: null },
              { name: "eBay", logo: null },
              { name: "Etsy", logo: null },
              { name: "BigCommerce", logo: null },
            ].map(p => (
              <div key={p.name} style={{ background: "#fff", border: "1px solid #eee", padding: 16, borderRadius: 12, minWidth: 140 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI Insights Showcase ── */}
      <section style={{ padding: "78px 24px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.00) 55%)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>AI insights</div>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)", fontWeight: 900, letterSpacing: "-2px", color: "#111", marginBottom: 14 }}>Decisions, not dashboards</h2>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>SellerSync turns your orders and inventory into actionable recommendations.</p>
          </div>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}
        >
          {[
            { title: "Restock needs", desc: "AI highlights products likely to run low so you can reorder on time.", icon: "⟳" },
            { title: "Best-performing products", desc: "See which items are driving sales momentum.", icon: "∞" },
            { title: "Sales trends", desc: "Understand how performance changes over time.", icon: "◴" },
            { title: "Inventory health", desc: "Get a clear view of what’s safe vs. at risk.", icon: "▤" },
          ].map((x, i) => (
            <motion.div
              key={x.title}
              variants={fadeUp}
              custom={i * 0.05}
              whileHover={{ y: -6, scale: 1.01, boxShadow: "0 20px 70px rgba(99,102,241,0.12)" }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{ background: "#fff", borderRadius: 22, border: "1px solid rgba(99,102,241,0.14)", padding: 16, boxShadow: "0 20px 70px rgba(99,102,241,0.08)" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 16, background: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(139,92,246,0.10))", border: "1px solid rgba(99,102,241,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <span style={{ color: "#7c3aed", fontWeight: 900, fontSize: 18 }}>{x.icon}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#111", marginBottom: 8 }}>{x.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{x.desc}</div>
              <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: "linear-gradient(90deg, rgba(124,58,237,0.25), rgba(124,58,237,0.00))" }} />
            </motion.div>
          ))}
        </motion.div>
      </section>


      {/* ── FINAL CTA ── */}
      <section style={{ padding: "72px 24px 96px", position: "relative", overflow: "hidden", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)", opacity: 0.05 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(32px,4.8vw,60px)", fontWeight: 900, letterSpacing: "-2.2px", color: "#111", lineHeight: 1.05, marginBottom: 18 }}>
              Ready to get control
              <br />
              <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>of inventory?</span>
            </h2>
            <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 26, lineHeight: 1.7 }}>
              Add products and orders, let stock update when you ship, and use AI insights to restock smarter.
            </p>
            <RippleButton
              style={{ fontSize: 18, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 16, padding: "16px 44px", cursor: "pointer", boxShadow: "0 12px 40px rgba(99,102,241,0.35)", transition: "all 0.22s" }}
              onClick={() => navigate("/signup")}
            >
              Get Started →
            </RippleButton>
          </Reveal>
        </div>
      </section>


      {/* ── Docs / FAQ (anchor) ── */}
      <section data-nav="docs" style={{ padding: "54px 24px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#7c3aed", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 14 }}>Docs</div>
          <h2 style={{ fontSize: "clamp(22px,3.2vw,34px)", fontWeight: 900, color: "#111" }}>Frequently asked questions</h2>
          <p style={{ color: "#6b7280", maxWidth: 720, margin: "8px auto 0" }}>Quick answers to common questions about integrations, billing, and setup.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { q: "How do I connect my Shopify store?", a: "Go to Integrations → Shopify and follow the OAuth steps to connect your store." },
            { q: "Can I export transaction history?", a: "Yes — export CSV from the dashboard history view under Transactions." },
            { q: "Is there a trial?", a: "We offer a 14-day trial for all plans. No credit card required to start." },
            { q: "How does billing work?", a: "Monthly and annual billing are supported. Upgrade/downgrade from Billing settings." },
          ].map(item => (
            <div key={item.q} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{item.q}</div>
              <div style={{ color: "#6b7280" }}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #f0f0f0", background: "#fff", padding: "48px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#111" }}>SellerSync</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy","Terms","Security","Status","Docs"].map(l => <a key={l} href="#" style={{ fontSize: 13, color: "#999", textDecoration: "none", fontWeight: 500 }}>{l}</a>)}
          </div>
          <div style={{ fontSize: 13, color: "#bbb" }}>© 2026 SellerSync, Inc.</div>
        </div>
      </footer>
    </div>
  );
}
