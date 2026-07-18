import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const theme = {
  bgPrimary: "var(--bg-primary)",
  bgSecondary: "var(--bg-secondary)",
  surface: "var(--bg-surface)",
  surfaceRaised: "var(--surface-raised)",
  border: "var(--border-color)",
  borderSubtle: "var(--border-subtle)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentInk: "var(--accent-ink)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  shadow: "var(--shadow-md)",
};

function RippleButton({ children, onClick, style }) {
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

function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Navbar({ scrolled, activeSection, onScrollTo }) {
  const navigate = useNavigate();

  const links = [
    { id: "product", label: "Product" },
    { id: "workflow", label: "Workflow" },
    { id: "pages", label: "Pages" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(255,255,255,0.94)" : "rgba(17,24,39,0.18)",
        backdropFilter: "saturate(180%) blur(18px)",
        borderBottom: scrolled ? "1px solid rgba(15,23,42,0.08)" : "1px solid rgba(255,255,255,0.18)",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/")}>
          <span style={{ fontWeight: 800, color: "#111827", fontSize: 18, letterSpacing: "-0.02em" }}>SellerSync</span>
        </div>

        <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(event) => {
                event.preventDefault();
                onScrollTo?.(link.id);
              }}
              style={{
                fontSize: 14,
                fontWeight: activeSection === link.id ? 700 : 500,
                color: activeSection === link.id ? "#111827" : "#6b7280",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => navigate("/login")}
            style={{ border: "none", background: "transparent", color: scrolled ? "#374151" : "#f8fafc", fontWeight: 600, cursor: "pointer", padding: "8px 12px" }}
          >
            Sign in
          </button>
          <RippleButton
            style={{ border: "none", borderRadius: 999, padding: "10px 16px", background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            onClick={() => navigate("/signup")}
          >
            Get started
          </RippleButton>
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("product");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("section[data-nav]"));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && visible.target.dataset.nav) {
          setActiveSection(visible.target.dataset.nav);
        }
      },
      { threshold: [0.35, 0.5, 0.75] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const featureCards = [
    {
      title: "Manage products",
      desc: "Create and organize your product catalog, keep stock visible, and update inventory as your business grows.",
      icon: "▤",
    },
    {
      title: "Track orders",
      desc: "Capture orders, monitor status, and keep customer context attached to every sale.",
      icon: "◈",
    },
    {
      title: "Know your customers",
      desc: "See customer history, repeat buyers, and purchase activity without leaving the dashboard.",
      icon: "◎",
    },
    {
      title: "Review transactions",
      desc: "Follow revenue movement, payment status, and account activity from a single place.",
      icon: "∞",
    },
  ];

  const workflowSteps = [
    {
      title: "1. Add your products",
      desc: "Build a catalog with the basics you need to keep track of stock and activity.",
    },
    {
      title: "2. Log your orders",
      desc: "Record what sold, who bought it, and how the order is progressing.",
    },
    {
      title: "3. Review the health of the business",
      desc: "Use the dashboard to spot low stock, sales changes, and customer patterns.",
    },
  ];

  const appPages = [
    ["Dashboard", "See orders, activity, and the current state of your store at a glance."],
    ["Products", "Add, update, and manage your catalog and stock levels."],
    ["Orders", "Track order progress and keep customer information connected to each sale."],
    ["Customers", "Review order history and customer activity over time."],
    ["Transactions", "Monitor payments, revenue movement, and business activity."],
    ["Settings", "Adjust your store profile and app preferences."],
  ];

  return (
    <div style={{ background: theme.bgPrimary, color: theme.textPrimary, minHeight: "100vh", fontFamily: "var(--font-body)" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg-primary); color: var(--text-primary); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 999px; }
      `}</style>

      <Navbar scrolled={scrolled} activeSection={activeSection} onScrollTo={scrollToSection} />

      <section style={{ position: "relative", padding: "128px 24px 88px", overflow: "hidden", background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-soft) 45%, var(--bg-secondary) 100%)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at top left, rgba(217, 106, 83, 0.14), transparent 36%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", display: "grid", gap: 28, alignItems: "center", gridTemplateColumns: "1.05fr 0.95fr" }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(255,255,255,0.86)", border: "1px solid var(--border-color)", boxShadow: "0 10px 30px rgba(44, 38, 35, 0.04)", marginBottom: 18 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.accentInk }}>A practical CRM-style workspace for sellers</span>
            </div>
            <h1 style={{ fontSize: "clamp(36px, 5.2vw, 58px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: "-1.7px", marginBottom: 16, color: theme.textPrimary }}>
              Keep products, orders, customers, and revenue in one place.
            </h1>
            <p style={{ fontSize: "clamp(16px, 1.8vw, 20px)", lineHeight: 1.75, color: theme.textSecondary, maxWidth: 640, marginBottom: 24 }}>
              SellerSync gives small sellers a clear way to manage inventory, follow orders, review customer activity, and keep an eye on transactions without juggling separate spreadsheets or tools.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <RippleButton
                style={{ fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)`, border: "none", borderRadius: 999, padding: "12px 20px", cursor: "pointer", boxShadow: "0 12px 24px rgba(217, 106, 83, 0.2)" }}
                onClick={() => navigate("/signup")}
              >
                Start with SellerSync
              </RippleButton>
              <button
                onClick={() => navigate("/login")}
                style={{ fontSize: 15, fontWeight: 700, color: theme.textSecondary, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 999, padding: "12px 20px", cursor: "pointer" }}
              >
                Sign in
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.08 }}>
            <div style={{ background: theme.surface, borderRadius: 24, border: `1px solid ${theme.border}`, boxShadow: "0 24px 80px rgba(44, 38, 35, 0.08)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary }}>Today at a glance</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>Live workspace</div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ background: theme.accentSoft, borderRadius: 16, padding: 14, border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 12, color: theme.accentInk, fontWeight: 800, marginBottom: 6 }}>Dashboard</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>Sales overview + recent activity</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: theme.surfaceRaised, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 14 }}>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>Products</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>Catalog + stock</div>
                  </div>
                  <div style={{ background: theme.surfaceRaised, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 14 }}>
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>Orders</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: theme.textPrimary }}>Status tracking</div>
                  </div>
                </div>
                <div style={{ background: theme.surfaceRaised, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 14 }}>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>Customer activity</div>
                  <div style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.6 }}>Review repeat buyers, order history, and transaction notes in the same workspace.</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="product" data-nav="product" style={{ padding: "72px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.accent, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 10 }}>What SellerSync covers</div>
            <h2 style={{ fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 900, letterSpacing: "-1.2px", color: theme.textPrimary, marginBottom: 10 }}>Built for the core day-to-day of running a small store</h2>
            <p style={{ fontSize: 16, color: theme.textSecondary, maxWidth: 720, margin: "0 auto", lineHeight: 1.7 }}>This is a focused operations dashboard for managing products, orders, customers, and revenue, with AI-assisted guidance where it adds value.</p>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          {featureCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 20, boxShadow: `0 12px 32px rgba(44, 38, 35, 0.05)` }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 12, background: theme.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: theme.accent }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: theme.textPrimary, marginBottom: 8 }}>{card.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: theme.textSecondary }}>{card.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="workflow" data-nav="workflow" style={{ padding: "20px 24px 88px", maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.accent, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, letterSpacing: "-1px", color: theme.textPrimary, marginBottom: 10 }}>A simple flow for everyday operations</h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {workflowSteps.map((step) => (
            <div key={step.title} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: theme.textSecondary }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pages" data-nav="pages" style={{ padding: "0 24px 92px", maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.accent, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 10 }}>Inside the app</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, letterSpacing: "-1px", color: theme.textPrimary, marginBottom: 10 }}>A clear workspace for the pages you actually use</h2>
          </div>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {appPages.map(([title, description]) => (
            <div key={title} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18, padding: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.textPrimary, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: theme.textSecondary }}>{description}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="get-started" data-nav="get-started" style={{ padding: "0 24px 96px" }}>
        <Reveal>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--accent-soft) 100%)", border: `1px solid ${theme.border}`, borderRadius: 24, padding: "34px 24px", boxShadow: "0 16px 50px rgba(44, 38, 35, 0.06)" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.accent, letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 10 }}>Ready to try it?</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 900, color: theme.textPrimary, marginBottom: 10 }}>Start with the pages that matter most: products, orders, and customers.</h2>
            <p style={{ fontSize: 16, color: theme.textSecondary, lineHeight: 1.7, marginBottom: 20 }}>SellerSync keeps the experience focused on the work of running a store, not on flashy extras that don’t help you ship the next order.</p>
            <RippleButton
              style={{ fontSize: 15, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)`, border: "none", borderRadius: 999, padding: "12px 22px", cursor: "pointer", boxShadow: "0 12px 24px rgba(217, 106, 83, 0.2)" }}
              onClick={() => navigate("/signup")}
            >
              Create your workspace
            </RippleButton>
          </div>
        </Reveal>
      </section>

      <footer style={{ borderTop: `1px solid ${theme.border}`, background: theme.surface, padding: "28px 24px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ color: theme.textMuted, fontSize: 13 }}>Built for small sellers who want clarity over complexity.</div>
        </div>
      </footer>
    </div>
  );
}
