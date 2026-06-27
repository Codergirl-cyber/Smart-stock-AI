import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";


// ── Utility ──────────────────────────────────────────────────────────────────
const cn = (...cs) => cs.filter(Boolean).join(" ");

function useCountUp(target, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

// ── Micro sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color = "#6366f1", h = 32, w = 80 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBar({ data, color = "#6366f1" }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, background: i === data.length - 1 ? color : color + "55", borderRadius: 3, height: `${(v / max) * 100}%`, transition: "height 0.4s" }} />
      ))}
    </div>
  );
}

// ── Animated mesh background ──────────────────────────────────────────────────
function MeshBg() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: "-20%", left: "20%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)", animation: "blob1 8s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", top: "10%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)", animation: "blob2 10s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", bottom: "0%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", animation: "blob1 12s ease-in-out infinite alternate-reverse" }} />
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

// ── Bento card ────────────────────────────────────────────────────────────────
function BentoCard({ title, sub, children, span = 1, accent = "#6366f1" }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        gridColumn: `span ${span}`,
        background: "#fff",
        borderRadius: 24,
        border: "1px solid #f0f0f0",
        padding: 28,
        boxShadow: hover ? `0 20px 60px rgba(99,102,241,0.12), 0 0 0 1px ${accent}30` : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.3s, transform 0.3s",
        transform: hover ? "translateY(-3px)" : "none",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#111", letterSpacing: "-0.3px", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Section reveal wrapper ────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(32px)", transition: `opacity 0.65s ${delay}s, transform 0.65s ${delay}s cubic-bezier(0.16,1,0.3,1)` }}>
      {children}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ scrolled }) {
  const navigate = useNavigate();

  return (

    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(250,250,250,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
      transition: "all 0.3s",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L7 12L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#111", letterSpacing: "-0.4px" }}>SellerSync</span>
        </div>
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {["Product","Pricing","Integrations","Docs"].map(l => (
            <a key={l} href="#" style={{ fontSize: 14, color: "#555", fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
               onMouseEnter={e => e.target.style.color = "#111"} onMouseLeave={e => e.target.style.color = "#555"}>{l}</a>
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
          <button
            style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "9px 20px", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.target.style.transform = "translateY(-1px)"; e.target.style.boxShadow = "0 6px 20px rgba(99,102,241,0.4)"; }}
            onMouseLeave={e => { e.target.style.transform = "none"; e.target.style.boxShadow = "0 4px 12px rgba(99,102,241,0.3)"; }}
            onClick={() => navigate("/signup")}
          >
            Get started →
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Pricing card ──────────────────────────────────────────────────────────────
function PricingCard({ plan, price, desc, features, highlighted, cta }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 24, padding: 32, position: "relative", overflow: "hidden",
        background: highlighted ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#fff",
        border: highlighted ? "none" : "1px solid #ebebeb",
        boxShadow: hover ? (highlighted ? "0 24px 60px rgba(99,102,241,0.35)" : "0 12px 40px rgba(0,0,0,0.08)") : (highlighted ? "0 12px 40px rgba(99,102,241,0.25)" : "0 2px 8px rgba(0,0,0,0.04)"),
        transform: highlighted ? (hover ? "translateY(-6px) scale(1.01)" : "scale(1.01)") : (hover ? "translateY(-4px)" : "none"),
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        flex: 1,
      }}
    >
      {highlighted && <div style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "#fff", fontWeight: 600, backdropFilter: "blur(4px)" }}>Most popular</div>}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: highlighted ? "rgba(255,255,255,0.7)" : "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>{plan}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: highlighted ? "#fff" : "#111", letterSpacing: "-1.5px" }}>{price}</span>
          {price !== "Custom" && <span style={{ fontSize: 13, color: highlighted ? "rgba(255,255,255,0.6)" : "#aaa" }}>/mo</span>}
        </div>
        <div style={{ fontSize: 13, color: highlighted ? "rgba(255,255,255,0.7)" : "#888", marginTop: 6 }}>{desc}</div>
      </div>
      <div style={{ height: 1, background: highlighted ? "rgba(255,255,255,0.15)" : "#f0f0f0", margin: "20px 0" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: highlighted ? "rgba(255,255,255,0.9)" : "#555" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: highlighted ? "rgba(255,255,255,0.2)" : "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke={highlighted ? "#fff" : "#7c3aed"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            {f}
          </div>
        ))}
      </div>
      <button style={{
        width: "100%", padding: "13px", borderRadius: 12, border: highlighted ? "none" : "1.5px solid #6366f1",
        background: highlighted ? "#fff" : "transparent", color: highlighted ? "#6366f1" : "#6366f1",
        fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.target.style.background = highlighted ? "#f5f3ff" : "#ede9fe"; }}
        onMouseLeave={e => { e.target.style.background = highlighted ? "#fff" : "transparent"; }}
      >{cta}</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [metricsRef, metricsInView] = useInView(0.3);
  const sellers = useCountUp(2847, 2000, metricsInView);
  const synced = useCountUp(1200000, 2000, metricsInView);
  const uptime = useCountUp(9998, 2000, metricsInView);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const integrations = [
    { name: "Amazon", color: "#f59e0b", icon: "A" },
    { name: "Shopify", color: "#95bf47", icon: "S" },
    { name: "eBay", color: "#e53238", icon: "e" },
    { name: "Walmart", color: "#0071dc", icon: "W" },
    { name: "Etsy", color: "#f56400", icon: "E" },
    { name: "WooCommerce", color: "#96588a", icon: "wc" },
    { name: "Stripe", color: "#635bff", icon: "St" },
    { name: "QuickBooks", color: "#2ca01c", icon: "QB" },
  ];

  const testimonials = [
    { name: "Jordan Mena", role: "Head of Operations · ScaleFast", text: "We went from syncing three marketplaces manually in 4 hours to fully automated in under 90 seconds. SellerSync is the backbone of our entire ops stack.", avatar: "JM", color: "#ede9fe", tc: "#7c3aed" },
    { name: "Priya Nath", role: "CTO · Arcline Commerce", text: "The inventory reconciliation alone saved us $60K in phantom stock write-offs last quarter. The analytics are genuinely insightful — not just charts for the sake of charts.", avatar: "PN", color: "#dcfce7", tc: "#16a34a" },
    { name: "Marcus Holt", role: "Founder · VaultShop EU", text: "Every other platform we tried felt like it was built for the company, not the customer. SellerSync actually ships features people ask for. The velocity is unreal.", avatar: "MH", color: "#fef3c7", tc: "#d97706" },
  ];

  const faqs = [
    { q: "How long does onboarding take?", a: "Most teams are fully synced within 20 minutes. We auto-discover your existing seller accounts and map them — no manual CSV uploads." },
    { q: "Which marketplaces do you support?", a: "Amazon, Shopify, eBay, Walmart, Etsy, WooCommerce, and 40+ more. New integrations ship every two weeks." },
    { q: "Is my data secure?", a: "SOC 2 Type II certified. All data is encrypted in transit and at rest. We never store marketplace credentials — we use OAuth where available." },
    { q: "Can I try it before paying?", a: "Yes. 14-day free trial, no credit card required. Full access to all Pro features during the trial period." },
  ];

  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ background: "#fafafa", fontFamily: "system-ui, -apple-system, 'Inter', sans-serif", color: "#111", minHeight: "100vh" }}>
      <style>{`
        @keyframes blob1 { from { transform: translate(0,0) scale(1); } to { transform: translate(40px,30px) scale(1.1); } }
        @keyframes blob2 { from { transform: translate(0,0) scale(1.05); } to { transform: translate(-30px,20px) scale(0.95); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fafafa; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
      `}</style>

      <Navbar scrolled={scrolled} />

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 120, paddingBottom: 80, overflow: "hidden" }}>
        <MeshBg />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 1280, margin: "0 auto", padding: "0 32px", width: "100%" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8e8e8", borderRadius: 20, padding: "6px 14px", marginBottom: 32, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "#555" }}>Now in GA — 40+ marketplace integrations</span>
            <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>See what's new →</span>
          </div>

          <h1 style={{ fontSize: "clamp(44px,7vw,88px)", fontWeight: 900, letterSpacing: "-3px", lineHeight: 1.02, color: "#0a0a0a", marginBottom: 24, maxWidth: 960, margin: "0 auto 24px" }}>
            Unified seller ops,<br />
            <span style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>zero friction.</span>
          </h1>

          <p style={{ fontSize: "clamp(16px,2vw,20px)", color: "#666", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6, fontWeight: 400 }}>
            One platform to synchronize every marketplace, automate workflows, monitor inventory, and make sense of your data — in real time.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 80 }}>
            <button
              style={{ fontSize: 16, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 14, padding: "15px 32px", cursor: "pointer", boxShadow: "0 8px 24px rgba(99,102,241,0.35)", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 36px rgba(99,102,241,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.35)"; }}
            >
              Start free trial
            </button>
            <button
              style={{ fontSize: 16, fontWeight: 600, color: "#444", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 14, padding: "15px 28px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
            >
              ▶ Watch demo
            </button>
          </div>

          {/* Dashboard */}
          <div style={{ animation: "float 6s ease-in-out infinite", maxWidth: 960, margin: "0 auto" }}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── TRUST METRICS ── */}
      <section ref={metricsRef} style={{ background: "#fff", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", padding: "48px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, textAlign: "center" }}>
          {[
            { val: sellers.toLocaleString(), suffix: "+", label: "Active sellers" },
            { val: (synced / 1000000).toFixed(1), suffix: "M+", label: "Records synced daily" },
            { val: (uptime / 100).toFixed(2), suffix: "%", label: "Uptime SLA" },
            { val: "1.4", suffix: "s", label: "Avg. sync latency" },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#111" }}>
                {m.val}<span style={{ color: "#6366f1" }}>{m.suffix}</span>
              </div>
              <div style={{ fontSize: 14, color: "#888", marginTop: 4, fontWeight: 500 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 32px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Platform</div>
            <h2 style={{ fontSize: "clamp(32px,4vw,56px)", fontWeight: 900, letterSpacing: "-2px", color: "#111", lineHeight: 1.1, marginBottom: 16 }}>Everything connected.<br />Nothing duplicated.</h2>
            <p style={{ fontSize: 17, color: "#777", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>A cohesive platform that replaces six spreadsheets and three dashboards with one.</p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          <Reveal delay={0}>
            <BentoCard title="Real-time sync" sub="Push changes to every marketplace in under 2 seconds. Automatic conflict resolution built in.">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Amazon","Shopify","eBay","Walmart","Etsy"].map((p,i) => (
                  <div key={p} style={{ padding: "5px 12px", background: `hsl(${i*55+200},60%,95%)`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: `hsl(${i*55+200},50%,40%)` }}>{p}</div>
                ))}
              </div>
              <div style={{ marginTop: 16, background: "#fafafa", borderRadius: 12, padding: 12, border: "1px solid #f0f0f0" }}>
                {["SKU-4821 → synced 2s ago","SKU-9034 → synced 3s ago","SKU-1102 → syncing…"].map((r,i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 11, color: "#666", borderBottom: i < 2 ? "1px solid #f5f5f5" : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: i === 2 ? "#f59e0b" : "#22c55e", flexShrink: 0, animation: i === 2 ? "pulse 1.5s infinite" : "none" }} />
                    {r}
                  </div>
                ))}
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={0.05}>
            <BentoCard title="Inventory intelligence" sub="Unified stock view across all warehouses and channels. Reorder alerts before you run out.">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { name: "In stock", val: 4820, color: "#22c55e" },
                  { name: "Low stock", val: 312, color: "#f59e0b" },
                  { name: "Out of stock", val: 48, color: "#ef4444" },
                  { name: "Reserved", val: 920, color: "#6366f1" },
                ].map(s => (
                  <div key={s.name} style={{ background: "#fafafa", borderRadius: 10, padding: 10, border: "1px solid #f0f0f0" }}>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>{s.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.val.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={0.1}>
            <BentoCard title="Workflow automation" sub="Build once, run everywhere. Trigger automations based on inventory thresholds, order events, or time.">
              <div style={{ background: "#fafafa", borderRadius: 12, padding: 12, border: "1px solid #f0f0f0" }}>
                {[
                  { trigger: "Stock < 10", action: "Reorder → Supplier A", on: true },
                  { trigger: "Order placed", action: "Notify warehouse", on: true },
                  { trigger: "Price change", action: "Sync to all channels", on: false },
                ].map((w,i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 2 ? "1px solid #f0f0f0" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>{w.trigger}</div>
                      <div style={{ fontSize: 10, color: "#999" }}>→ {w.action}</div>
                    </div>
                    <div style={{ width: 32, height: 18, borderRadius: 9, background: w.on ? "#6366f1" : "#e0e0e0", position: "relative", cursor: "pointer" }}>
                      <div style={{ position: "absolute", top: 2, left: w.on ? 14 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={0.0}>
            <BentoCard title="AI-powered insights" sub="Surface revenue opportunities, flag anomalies, and predict stockouts — automatically." accent="#8b5cf6">
              <div style={{ background: "linear-gradient(135deg,#ede9fe,#faf5ff)", borderRadius: 12, padding: 14, border: "1px solid #e9d5ff" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.5"/><path d="M7 4v3l2 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed" }}>AI Insight</div>
                </div>
                {["eBay sales up 23% this week — consider raising prices on SKU-0394","Restock TechBridge Co. SKUs before weekend demand spike","VaultShop EU latency 4× normal — check API key expiry"].map((t,i) => (
                  <div key={i} style={{ fontSize: 12, color: "#6d28d9", lineHeight: 1.5, padding: "5px 0", borderBottom: i < 2 ? "1px solid #e9d5ff" : "none" }}>• {t}</div>
                ))}
              </div>
            </BentoCard>
          </Reveal>

          <Reveal delay={0.05}>
            <BentoCard title="Revenue analytics" sub="Drill into performance by channel, seller, SKU, or region. Export in one click." span={2}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "GMV this month", val: "$103.2K", chg: "+18.4%", data: revenueData, color: "#6366f1" },
                  { label: "Avg. order value", val: "$84.20", chg: "+6.1%", data: [50,52,49,55,58,61,60,64,67,65,70,72], color: "#8b5cf6" },
                  { label: "Return rate", val: "2.1%", chg: "-0.4%", data: [8,7,9,8,7,6,7,5,5,4,4,4], color: "#10b981" },
                ].map(m => (
                  <div key={m.label} style={{ background: "#fafafa", borderRadius: 12, padding: 12, border: "1px solid #f0f0f0" }}>
                    <div style={{ fontSize: 10, color: "#999", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.3px" }}>{m.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#111", letterSpacing: "-0.5px" }}>{m.val}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <span style={{ fontSize: 10, color: m.chg.startsWith("+") ? "#16a34a" : "#ef4444", fontWeight: 600 }}>{m.chg}</span>
                      <MiniBar data={m.data} color={m.color} />
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>
          </Reveal>
        </div>
      </section>

      {/* ── INTEGRATIONS ── */}
      <section style={{ background: "#fff", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Integrations</div>
              <h2 style={{ fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#111", marginBottom: 14 }}>Your stack, connected.</h2>
              <p style={{ fontSize: 16, color: "#888", maxWidth: 420, margin: "0 auto" }}>40+ pre-built connectors. Custom webhooks for anything else. No code required.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {integrations.map((intg, i) => (
                <div key={intg.name}
                  style={{ background: "#fafafa", border: "1px solid #ebebeb", borderRadius: 18, padding: "24px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.background = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "#fafafa"; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: intg.color + "22", border: `1px solid ${intg.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: intg.color, flexShrink: 0 }}>{intg.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#222" }}>{intg.name}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Connected</div>
                  </div>
                  <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "120px 32px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Testimonials</div>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#111" }}>Teams shipping faster.</h2>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 24, padding: 32, boxShadow: "0 4px 16px rgba(0,0,0,0.04)", transition: "all 0.3s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ fontSize: 15, color: "#444", lineHeight: 1.7, marginBottom: 28 }}>"{t.text}"</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: t.tc }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ background: "#fff", borderTop: "1px solid #f0f0f0", padding: "120px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: 72 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Pricing</div>
              <h2 style={{ fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#111", marginBottom: 14 }}>Simple, transparent pricing.</h2>
              <p style={{ fontSize: 16, color: "#888" }}>No hidden fees. Cancel any time.</p>
            </div>
          </Reveal>
          <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
            <PricingCard plan="Starter" price="$49" desc="For small teams getting started" cta="Start free trial"
              features={["Up to 5 sellers","3 marketplace integrations","10,000 syncs/month","Basic analytics","Email support"]} />
            <PricingCard plan="Pro" price="$149" desc="For growing operations teams" cta="Start free trial" highlighted
              features={["Up to 50 sellers","All 40+ integrations","Unlimited syncs","Advanced analytics","Workflow automation","Priority support"]} />
            <PricingCard plan="Enterprise" price="Custom" desc="For large-scale operations" cta="Talk to sales"
              features={["Unlimited sellers","Custom integrations","Dedicated infrastructure","SLA guarantee","Custom onboarding","24/7 support"]} />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "100px 32px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px,3.5vw,44px)", fontWeight: 900, letterSpacing: "-1.5px", color: "#111" }}>Common questions.</h2>
          </div>
        </Reveal>
        {faqs.map((faq, i) => (
          <Reveal key={i} delay={i * 0.05}>
            <div style={{ borderBottom: "1px solid #f0f0f0", padding: "20px 0", cursor: "pointer" }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>{faq.q}</div>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "transform 0.3s, background 0.2s", transform: openFaq === i ? "rotate(45deg)" : "none", background: openFaq === i ? "#ede9fe" : "#f5f5f5" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5h6" stroke={openFaq === i ? "#7c3aed" : "#999"} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
              </div>
              {openFaq === i && <div style={{ fontSize: 15, color: "#666", lineHeight: 1.7, marginTop: 12, animation: "none" }}>{faq.a}</div>}
            </div>
          </Reveal>
        ))}
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "80px 32px 120px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)", opacity: 0.04 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)" }} />
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontSize: "clamp(36px,5vw,68px)", fontWeight: 900, letterSpacing: "-2.5px", color: "#111", lineHeight: 1.05, marginBottom: 20 }}>
              Ready to sync<br />
              <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>everything?</span>
            </h2>
            <p style={{ fontSize: 18, color: "#888", marginBottom: 40, lineHeight: 1.6 }}>14 days free. No credit card. Full access to every feature.</p>
            <button
              style={{ fontSize: 18, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 16, padding: "18px 48px", cursor: "pointer", boxShadow: "0 12px 40px rgba(99,102,241,0.35)", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(99,102,241,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(99,102,241,0.35)"; }}
            >
              Start free trial →
            </button>
          </Reveal>
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
