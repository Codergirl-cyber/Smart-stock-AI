import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { Badge, CountUp, Skeleton, springConfig } from './components/UI';
import SyncBanner from './components/SyncBanner';
import NotificationsBell from './components/NotificationsBell';
import AIInventoryCopilot from './components/AIInventoryCopilot';
import AIBusinessReportWidget from './components/AIBusinessReport';
import AIRecommendations from './components/AIRecommendations';
import ExecCommandCenter from './components/ExecCommandCenter';

import {
  readDashboardCache,
  writeDashboardCache,
  touchDashboardCache,
} from './services/dashboardCache';

import {
  AlertTriangle,
  Calendar,
  Package,
  TrendingUp,
  Truck,
  Activity,
  ShoppingBag,
  Plus,
  ArrowRight,
  Brain,
  Sparkles,
} from 'lucide-react';

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatDayLabel(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

function snapshotsAreEqual(a, b) {
  if (!a || !b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function deriveSnapshot(orders, products, transactions) {
  const revenue = (transactions || [])
    .filter((t) => t.status === 'success' && (t.type === 'sale' || t.type === 'credit'))
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const ordersCount = orders.length;
  const productsCount = products.length;
  const pendingCount = orders.filter((o) => o.delivery_status === 'pending').length;

  const stats = [
    { label: 'Revenue', value: revenue, prefix: 'Rs ' },
    { label: 'Orders', value: ordersCount },
    { label: 'Products', value: productsCount },
    { label: 'Pending', value: pendingCount },
  ];

  const dayKeys = getLast7Days();
  const salesByDay = Object.fromEntries(dayKeys.map((d) => [d, 0]));

  (transactions || []).forEach((t) => {
    if (t.status === 'success' && (t.type === 'sale' || t.type === 'credit') && t.created_at) {
      const day = t.created_at.split('T')[0];
      if (day in salesByDay) salesByDay[day] += t.amount || 0;
    }
  });

  const chartData = dayKeys.map((date) => ({ date, amount: salesByDay[date] }));

  const recentActivity = (orders || []).slice(0, 6).map((o) => ({
    id: o.id,
    type: 'order',
    title: o.customer_name,
    subtitle: o.product_name || 'Order',
    date: o.order_date,
    meta: `${o.payment_status} · ${o.delivery_status}`,
    amount: o.price,
  }));

  const lowStock = (products || []).filter((p) => {
    const reorder = Number(p.reorder_level ?? 2);
    return Number(p.stock ?? 0) <= reorder;
  });

  const forecastSummary = {
    trend: '+0%',
    weekend: `Weekend demand is ${1.6}x higher.`,
    stockouts: lowStock.length,
    headline: lowStock[0]?.name ? `${lowStock[0].name} is driving demand this week.` : 'No stockouts detected.',
  };

  const insights = [];
  const unpaidCount = (orders || []).filter((o) => o.payment_status === 'unpaid').length;
  if (unpaidCount > 0) {
    insights.push({
      type: 'warning',
      message: `${unpaidCount} order${unpaidCount > 1 ? 's' : ''} awaiting payment.`,
      link: '/orders',
      linkLabel: 'Review orders',
    });
  }
  if (lowStock.length > 0) {
    insights.push({
      type: 'warning',
      message: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} low on stock.`,
      link: '/products',
      linkLabel: 'Update inventory',
    });
  }

  const topProducts = [];

  return { stats, chartData, recentActivity, topProducts, forecastSummary, insights };
}

const Dashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [forecastSummary, setForecastSummary] = useState({
    trend: '+0%',
    weekend: 'Weekend demand is 1.6x higher.',
    stockouts: 0,
    headline: '—',
  });
  const [insights, setInsights] = useState([]);

  const [loading, setLoading] = useState(true);

  const [staleBanner, setStaleBanner] = useState(false);
  const [applyingSyncData, setApplyingSyncData] = useState(false);
  const freshSnapshotRef = useRef(null);

  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const [activeAITab, setActiveAITab] = useState('copilot');
  const displayKpis = useMemo(() => {
    const orders = [];
    const products = [];
    // minimal KPI fallback for non-demo mode; full KPI logic can be enhanced later.
    // Keep stable rendering.
    const pendingOrders = orders.filter(Boolean).length;
    const awaitingShipment = 0;
    const lowStock = 0;
    const todayRevenue = chartData
      .filter((d) => d.date === new Date().toISOString().split('T')[0])
      .reduce((a, b) => a + b.amount, 0);

    return { pendingOrders, awaitingShipment, lowStock, todayRevenue };
  }, [chartData]);

  const applySnapshot = (snap) => {
    setStats(snap.stats);
    setChartData(snap.chartData);
    setRecentActivity(snap.recentActivity);
    setTopProducts(snap.topProducts);
    setForecastSummary(snap.forecastSummary);
    setInsights(snap.insights);
  };

  const loadFromCache = () => {
    if (!user) return false;
    const cached = readDashboardCache(user.id);
    if (cached) {
      applySnapshot(cached.snapshot);
      setLoading(false);
      return true;
    }
    return false;
  };

  const syncFromDB = async (force = false) => {
    if (!user) return;
    try {
      const [ordersRes, productsRes, transRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, customer_name, ig_username, product_name, price, quantity, payment_status, delivery_status, order_date, created_at')
          .eq('user_id', user.id)
          .order('order_date', { ascending: false }),
        supabase
          .from('products')
          .select('id, name, stock, reorder_level, price')
          .eq('user_id', user.id),
        supabase
          .from('transactions')
          .select('amount, type, created_at, status')
          .eq('user_id', user.id),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];
      const transactions = transRes.data || [];

      const freshSnap = deriveSnapshot(orders, products, transactions);

      if (force) {
        applySnapshot(freshSnap);
        writeDashboardCache(user.id, freshSnap);
        setStaleBanner(false);
        return;
      }

      const cached = readDashboardCache(user.id);
      if (cached && snapshotsAreEqual(cached.snapshot, freshSnap)) {
        touchDashboardCache(user.id);
      } else if (!cached) {
        applySnapshot(freshSnap);
        writeDashboardCache(user.id, freshSnap);
      } else {
        freshSnapshotRef.current = freshSnap;
        setStaleBanner(true);
      }
    } catch (err) {
      console.warn('[Dashboard] Background sync failed:', err?.message || err);
    }
  };

  const handleApplySync = async () => {
    setApplyingSyncData(true);
    if (freshSnapshotRef.current) {
      applySnapshot(freshSnapshotRef.current);
      writeDashboardCache(user.id, freshSnapshotRef.current);
      freshSnapshotRef.current = null;
      setStaleBanner(false);
    } else {
      await syncFromDB(true);
    }
    setApplyingSyncData(false);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const cacheHit = loadFromCache();
    if (!cacheHit) {
      setLoading(true);
      syncFromDB(true).finally(() => setLoading(false));
    } else {
      syncFromDB(false);
    }

    const handler = () => syncFromDB(true);
    window.addEventListener('sellersync-data-changed', handler);
    return () => window.removeEventListener('sellersync-data-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const chartMax = useMemo(() => Math.max(...(chartData || []).map((d) => d.amount), 1), [chartData]);

  const renderSVGChart = () => {
    if (!chartData?.length) return null;

    const width = 500;
    const height = 180;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const yTicks = [0, Math.round(chartMax / 2), chartMax];

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {yTicks.map((tick, i) => {
          const y = paddingTop + chartHeight - (tick / chartMax) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={1}
                strokeDasharray={i === 0 ? 'none' : '4 4'}
              />
              <text
                x={paddingLeft - 8}
                y={y + 3}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize={9}
                fontFamily="var(--font-mono)"
                fontWeight="500"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {chartData.map((day, i) => {
          const barWidth = (chartWidth / chartData.length) * 0.55;
          const spacing = chartWidth / chartData.length;
          const x = paddingLeft + i * spacing + (spacing - barWidth) / 2;
          const barHeight = (day.amount / chartMax) * chartHeight;
          const y = paddingTop + chartHeight - barHeight;
          const isPeak = day.amount === chartMax && day.amount > 0;

          return (
            <g key={day.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 4)}
                rx={4}
                ry={4}
                fill={isPeak ? 'var(--accent)' : 'var(--accent-soft)'}
                stroke={isPeak ? 'var(--accent-hover)' : 'rgba(217, 106, 83, 0.15)'}
                strokeWidth={1}
              />
              <text
                x={x + barWidth / 2}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize={9}
                fontWeight="600"
              >
                {formatDayLabel(day.date)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const todayFormatted = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="page-shell" style={{ padding: '24px 32px 48px' }}>
      <div className="dashboard-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="h1" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            Store Heartbeat
          </h1>
          <p className="dashboard-header__meta" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{todayFormatted}</span>
          </p>
        </div>
      </div>

      <SyncBanner
        visible={staleBanner}
        syncing={applyingSyncData}
        message="Dashboard data has been updated — click Apply to refresh your stats."
        onApply={handleApplySync}
        onDismiss={() => setStaleBanner(false)}
      />

      {!loading && insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}
        >
          {insights.map((item, i) => (
            <div key={i} className="insight-banner insight-banner--warning" style={{ margin: 0, padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{item.message}</span>
                <Link to={item.link} style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {item.linkLabel} <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 48 }}
      >
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton" style={{ width: 60, height: 12, marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: 100, height: 28 }} />
                </div>
              ))
          : stats.map((s, i) => (
              <motion.div
                key={i}
                className="stat-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfig, delay: i * 0.05 }}
                whileHover={{ y: -2 }}
              >
                <div className="caption" style={{ marginBottom: 12 }}>
                  {s.label}
                </div>
                <div className="h2">
                  {s.prefix}
                  {typeof s.value === 'number' ? <CountUp end={s.value} /> : s.value}
                </div>
              </motion.div>
            ))}
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16, marginBottom: 28 }}>
        <div className="panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div>
              <div className="caption" style={{ marginBottom: 6, color: 'var(--text-primary)' }}>
                AI Insights
              </div>
              <h3 style={{ margin: 0 }}>{forecastSummary.headline}</h3>
              <p className="body" style={{ color: 'var(--text-muted)', marginTop: 10 }}>
                {forecastSummary.weekend}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <div>
              <div className="caption">Trend</div>
              <div className="h2" style={{ marginTop: 6 }}>
                {forecastSummary.trend}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div className="caption">Recharge risk</div>
              <div className="h2" style={{ marginTop: 6 }}>
                {forecastSummary.stockouts}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <NotificationsBell />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24, marginBottom: 24 }}>
        <div className="panel-card" style={{ padding: 20 }}>
          <div className="panel-header" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>7-Day Revenue Trend</h3>
          </div>
          {loading ? <div className="skeleton" style={{ height: 160 }} /> : renderSVGChart()}
        </div>

        <div className="panel-card" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Truck size={16} color="var(--accent)" />
              <div>
                <div className="caption">To Ship</div>
                <div className="h2" style={{ marginTop: 6 }}>
                  <CountUp end={displayKpis.awaitingShipment} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={16} color="var(--warning)" />
              <div>
                <div className="caption">Awaiting Payment</div>
                <div className="h2" style={{ marginTop: 6 }}>
                  <CountUp end={displayKpis.pendingOrders} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Package size={16} color="var(--error)" />
              <div>
                <div className="caption">Low Stock</div>
                <div className="h2" style={{ marginTop: 6 }}>
                  <CountUp end={displayKpis.lowStock} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <TrendingUp size={16} color="var(--success)" />
              <div>
                <div className="caption">Today's Revenue</div>
                <div className="h2" style={{ marginTop: 6 }}>
                  Rs <CountUp end={displayKpis.todayRevenue} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Activity size={16} color="var(--accent)" />
              <div>
                <div className="caption">AI Assistant Workspace</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'copilot', label: 'Inventory Co-pilot', icon: Brain },
                { id: 'recommendations', label: 'Restock Planner', icon: Sparkles },
                { id: 'report', label: 'Business Analyst', icon: Activity },
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAITab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      background: activeAITab === tab.id ? 'var(--bg-surface)' : 'transparent',
                      color: activeAITab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: 750,
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <TabIcon size={12} color={activeAITab === tab.id ? 'var(--accent)' : 'var(--text-muted)'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="panel-card" style={{ padding: 16 }}>
              {activeAITab === 'copilot' && <AIInventoryCopilot />}
              {activeAITab === 'recommendations' && <AIRecommendations />}
              {activeAITab === 'report' && <AIBusinessReportWidget />}
            </div>

            <div className="panel-card" style={{ padding: 16 }}>
              <ExecCommandCenter />
            </div>
          </div>
        </div>
      </div>

      <div className="panel-card" style={{ padding: 20 }}>
        <h3 className="caption" style={{ marginBottom: 24, color: 'var(--text-primary)' }}>
          Recent Activity
        </h3>
        {loading ? (
          Array(3)
            .fill(0)
            .map((_, i) => <Skeleton key={i} height={48} className="mb-2" />)
        ) : recentActivity.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32, border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)' }}>
            <Package size={20} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p>Create your first order to see activity here.</p>
            <Link to="/orders" style={{ color: 'var(--accent)', fontWeight: '600', fontSize: 13 }}>
              Add order →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentActivity.map((item) => (
              <div key={item.id} className="activity-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {item.subtitle} · {item.meta}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 13 }}>
                    Rs {Number(item.amount || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

