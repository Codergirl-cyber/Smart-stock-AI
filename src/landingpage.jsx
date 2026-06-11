import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Moon, PackageCheck, ReceiptText, Sun, TrendingUp } from "lucide-react";
import { Button } from "./components/UI";
import { useTheme } from "./context/ThemeContext";

const ease = [0.22, 1, 0.36, 1];

const container = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08
    }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease } }
};

const floatIn = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease, delay: 0.18 } }
};

const metrics = [
  { label: "Revenue", value: "$138.4k", hint: "+12.7% this week" },
  { label: "Orders", value: "278", hint: "18 pending" },
  { label: "Inventory", value: "5,240", hint: "Auto-sync" }
];

const orders = [
  ["Aarika Shah", "Silk scarf", "Paid"],
  ["Mina Rao", "Linen set", "Packed"],
  ["Tara Iyer", "Gold hoops", "New"]
];

const features = [
  {
    icon: PackageCheck,
    title: "Inventory that stays honest",
    desc: "Track stock as orders move, so your stories never sell what you cannot ship."
  },
  {
    icon: ReceiptText,
    title: "Orders without tab-hopping",
    desc: "Turn DMs into a clean fulfillment queue with payment, packing, and delivery status."
  },
  {
    icon: TrendingUp,
    title: "Revenue you can read fast",
    desc: "See what sold, what is pending, and where margin is improving at a glance."
  }
];

const LandingPage = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="landing-page">
      <div className="landing-page__background" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <motion.nav
        className="landing-nav"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
      >
        <div className="landing-brand">
          <span />
          SellerSync
        </div>
        <div className="landing-nav__links">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? "Light" : "Dark"}
          </Button>
          <a href="#features">Features</a>
          <a href="#preview">Preview</a>
          <Link to="/login"><Button size="sm" variant="ghost">Log in</Button></Link>
          <Link to="/signup"><Button size="sm">Sign up</Button></Link>
        </div>
      </motion.nav>

      <main className="landing-main">
        <section className="landing-hero">
          <motion.div
            className="landing-copy"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            <motion.p className="landing-eyebrow" variants={fadeUp}>
              Commerce operations for Instagram sellers
            </motion.p>

            <motion.h1 className="landing-headline" variants={fadeUp}>
              Sell beautifully. Operate without chaos.
            </motion.h1>

            <motion.p className="landing-description" variants={fadeUp}>
              SellerSync brings orders, inventory, fulfillment, and revenue into one focused workspace built for sellers who move fast.
            </motion.p>

            <motion.div className="landing-actions" variants={fadeUp}>
              <Link to="/login" className="landing-hero__primary-link">
                <motion.span
                  whileHover={{ backgroundColor: "var(--accent-hover)", y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="landing-hero__primary"
                >
                  Get started
                  <ArrowRight size={18} strokeWidth={2.5} />
                </motion.span>
              </Link>

              <Link to="/signup" className="landing-hero__secondary-link">
                <motion.span
                  whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.92)", color: "var(--text-primary)", y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="landing-hero__secondary"
                >
                  Sign up free
                </motion.span>
              </Link>
            </motion.div>

            <motion.div className="landing-proof" variants={fadeUp}>
              {["No spreadsheets", "Live inventory", "Built for repeat selling"].map((item) => (
                <span key={item}>
                  <Check size={14} />
                  {item}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            id="preview"
            className="landing-preview"
            variants={floatIn}
            initial="hidden"
            animate="visible"
          >
            <div className="landing-mockupScene">
              <div className="landing-mockupScene__tilt" aria-hidden="true" />

              <div className="landing-mockupLayers" aria-hidden="true">
                <div className="landing-mockupLayers__layer landing-mockupLayers__layer--back" />
                <div className="landing-mockupLayers__layer landing-mockupLayers__layer--mid" />
              </div>

              <div className="landing-mockup" role="img" aria-label="Today’s selling flow mockup">
                <div className="landing-mockup__top">
                  <div className="landing-mockup__brand">
                    <span className="landing-mockup__brandMark" />
                    SellerSync
                  </div>

                  <div className="landing-mockup__badges">
                    <span className="landing-pill landing-pill--accent">Today</span>
                    <span className="landing-pill">Instagram shop</span>
                  </div>
                </div>

                <div className="landing-mockup__title">
                  <p className="caption">Today’s selling flow</p>
                  <h2>Revenue → Orders → Inventory</h2>
                </div>

                <div className="landing-mockup__stats">
                  {metrics.map(({ label, value, hint }, idx) => (
                    <motion.div
                      className="landing-statWide"
                      key={label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.08 * idx }}
                      whileHover={{ y: -3 }}
                    >
                      <div className="landing-statWide__head">
                        <span className="landing-statWide__label">{label}</span>
                        <span className="landing-statWide__trend">
                          {idx === 0 ? "+12.7%" : idx === 1 ? "+8.1%" : "Stable"}
                        </span>
                      </div>
                      <div className="landing-statWide__value">{value}</div>
                      <div className="landing-statWide__hint">{hint}</div>
                      <div
                        className={`landing-statWide__spark landing-statWide__spark--${idx}`}
                        aria-hidden="true"
                      />
                    </motion.div>
                  ))}
                </div>

                <div className="landing-mockup__grid">
                  <motion.section
                    className="landing-glass landing-flow"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.22 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="landing-glass__head">
                      <span className="landing-glass__title">Orders activity</span>
                      <span className="landing-glass__meta">Last 2 hours</span>
                    </div>

                    <div className="landing-orderPills" aria-label="Order activity">
                      {[
                        { text: "Paid", tone: "accent" },
                        { text: "Packed", tone: "good" },
                        { text: "Shipped", tone: "blue" },
                        { text: "Pending", tone: "warn" }
                      ].map((p) => (
                        <span key={p.text} className={`landing-pill landing-pill--${p.tone}`}>
                          {p.text}
                        </span>
                      ))}
                    </div>

                    <div className="landing-miniChart" aria-hidden="true">
                      <div className="landing-miniChart__axis" />
                      <div className="landing-miniChart__line" />
                      <div className="landing-miniChart__bars">
                        {[22, 28, 19, 34, 26, 41, 36, 49].map((h, i) => (
                          <span key={i} style={{ height: `${h}px` }} />
                        ))}
                      </div>
                    </div>

                    <div className="landing-salesIndicators">
                      <div className="landing-indicator">
                        <span className="landing-indicator__k">Conversion</span>
                        <strong className="landing-indicator__v">3.8%</strong>
                      </div>
                      <div className="landing-indicator">
                        <span className="landing-indicator__k">Avg. order</span>
                        <strong className="landing-indicator__v">₹2.4k</strong>
                      </div>
                      <div className="landing-indicator landing-indicator--accent">
                        <span className="landing-indicator__k">Fulfillment</span>
                        <strong className="landing-indicator__v">98%</strong>
                      </div>
                    </div>
                  </motion.section>

                  <section className="landing-glass landing-side" aria-label="Sales notifications and recent orders">
                    <div className="landing-glass__head">
                      <span className="landing-glass__title">Notifications</span>
                      <span className="landing-glass__meta">Auto-updating</span>
                    </div>

                    <div className="landing-notifications">
                      <motion.div
                        className="landing-toast"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.32 }}
                      >
                        <span className="landing-toast__dot landing-toast__dot--accent" />
                        <div>
                          <div className="landing-toast__title">New order</div>
                          <div className="landing-toast__body">Silk scarf · Paid</div>
                        </div>
                        <span className="landing-toast__time">2m</span>
                      </motion.div>

                      <motion.div
                        className="landing-toast"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.38 }}
                      >
                        <span className="landing-toast__dot landing-toast__dot--good" />
                        <div>
                          <div className="landing-toast__title">Inventory synced</div>
                          <div className="landing-toast__body">Gold hoops · 12 left</div>
                        </div>
                        <span className="landing-toast__time">7m</span>
                      </motion.div>

                      <motion.div
                        className="landing-toast landing-toast--muted"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.44 }}
                      >
                        <span className="landing-toast__dot landing-toast__dot--blue" />
                        <div>
                          <div className="landing-toast__title">Revenue pulse</div>
                          <div className="landing-toast__body">+₹14.2k this week</div>
                        </div>
                        <span className="landing-toast__time">Now</span>
                      </motion.div>
                    </div>

                    <div className="landing-recentOrders" aria-label="Recent orders">
                      <div className="landing-glass__head landing-glass__head--tight">
                        <span className="landing-glass__title">Recent</span>
                        <span className="landing-glass__meta">3 updates</span>
                      </div>

                      {orders.map(([name, item, status], i) => (
                        <div className="landing-recentRow" key={name + i}>
                          <span className="landing-recentRow__who">{name}</span>
                          <span className="landing-recentRow__what">{item}</span>
                          <span
                            className={`landing-status landing-status--${
                              status === "Paid" ? "accent" : status === "Packed" ? "good" : "muted"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="landing-mockup__floating" aria-hidden="true">
                  <motion.div
                    className="landing-floatCard"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <span className="landing-floatCard__k">Inventory health</span>
                    <strong className="landing-floatCard__v">A+</strong>
                  </motion.div>

                  <motion.div
                    className="landing-floatCard landing-floatCard--secondary"
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 4.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.2
                    }}
                  >
                    <span className="landing-floatCard__k">Avg. response</span>
                    <strong className="landing-floatCard__v">11m</strong>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <motion.section
          id="features"
          className="landing-features"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
        >
          <motion.div className="landing-section-heading" variants={fadeUp}>
            <p className="caption">Why teams trust it</p>
            <h2>Everything important stays visible.</h2>
          </motion.div>

          <motion.div className="landing-features__panel" variants={fadeUp}>
            <div className="landing-features__deck">
              {features.map(({ icon: Icon, title, desc }) => (
                <div className="landing-feature" key={title}>
                  <div className="landing-feature__head">
                    <Icon size={20} strokeWidth={2.1} />
                    <h3>{title}</h3>
                  </div>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>
      </main>

      <footer className="landing-footer">
        <span className="caption">(c) 2025 SellerSync. Minimal. Powerful. Personal.</span>
      </footer>
    </div>
  );
};

export default LandingPage;
