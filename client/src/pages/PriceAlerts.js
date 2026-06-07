import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'https://shopsmart-backend-pful.onrender.com';

// ── Icons ─────────────────────────────────────────────────────────────────────
const BellIcon      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const SearchIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const RefreshIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const PauseIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const PlayIcon      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const TrashIcon     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const InfoIcon      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ArrowRightIcon= () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const SpinnerIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const CheckIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ── Dot grid background ────────────────────────────────────────────────────
const DotGrid = () => (
  <div aria-hidden="true" style={{
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
    backgroundSize: '28px 28px',
    opacity: 0.5,
  }} />
);

const GRAD = 'linear-gradient(135deg, #6366f1, #7c3aed)';
const ACCENT = '#6366f1';

const gradientText = {
  background: GRAD,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, type: 'spring', stiffness: 280, damping: 26 } }),
};

const PriceAlerts = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchAlerts();
    // eslint-disable-next-line
  }, [user]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAlerts(data.alerts || []);
      else setError(data.message || 'Failed to fetch alerts');
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this price alert?')) return;
    try {
      const res = await fetch(`${API}/alerts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAlerts((prev) => prev.filter((a) => a._id !== id));
      else alert('Failed to delete alert');
    } catch {
      alert('Cannot connect to server.');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${API}/alerts/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts((prev) => prev.map((a) => (a._id === id ? data.alert : a)));
      }
    } catch {
      alert('Cannot connect to server.');
    }
  };

  const handleCheckNow = async (id) => {
    try {
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, checking: true } : a)));
      const res = await fetch(`${API}/alerts/${id}/check-now`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => {
          if (a._id !== id) return a;
          const updated = { ...a, checking: false, currentPrice: data.currentPrice || a.currentPrice };
          if (data.status === 'price_met') { updated.isTriggered = true; updated.lastAlertSent = new Date().toISOString(); }
          updated.lastChecked = new Date().toISOString();
          return updated;
        }));
        if (data.status === 'price_met') alert(`🎉 Great news! ${data.message}\nStore: ${data.store}\nYou saved ₹${data.savings} below your target!`);
        else if (data.status === 'waiting') alert(`⏳ ${data.message}`);
        else if (data.status === 'not_found') alert(`📦 ${data.message}`);
      } else {
        setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, checking: false } : a)));
        alert(data.message || 'Failed to check price.');
      }
    } catch {
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, checking: false } : a)));
      alert('Cannot connect to server.');
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DotGrid />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: GRAD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#fff',
            boxShadow: '0 4px 18px rgba(99,102,241,0.3)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}>
            <BellIcon />
          </div>
          <p style={{ fontFamily: "'Sora', sans-serif", color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
            Loading your alerts…
          </p>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
        </div>
      </div>
    );
  }

  const activeCount    = alerts.filter(a => a.isActive).length;
  const triggeredCount = alerts.filter(a => a.isTriggered).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', fontFamily: "'Sora', 'Nunito', sans-serif", color: '#111827', position: 'relative' }}>
      <DotGrid />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 896, margin: '0 auto', padding: '88px 24px 80px' }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: GRAD, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#fff',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              }}>
                <BellIcon />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', ...gradientText }}>
                Price Alerts
              </h1>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', marginLeft: 48, fontWeight: 500 }}>
              We check prices every 12 hours and email you when your target is reached.
            </p>
          </div>

          <Link to="/" style={{ textDecoration: 'none' }}>
            <motion.span
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: '#fff', border: '1.5px solid #e5e7eb', color: '#374151',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'border-color 0.18s, color 0.18s',
                cursor: 'pointer',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.color = ACCENT; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
            >
              <SearchIcon /> Search Products <ArrowRightIcon />
            </motion.span>
          </Link>
        </motion.div>

        {/* ── Stats Row ── */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
          >
            {[
              { label: 'Total Alerts', value: alerts.length,    color: '#4f46e5' },
              { label: 'Active',       value: activeCount,      color: '#7c3aed' },
              { label: 'Triggered',    value: triggeredCount,   color: '#059669' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: '#fff', border: '1.5px solid #e5e7eb',
                borderRadius: 16, padding: '14px 18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <p style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: '#fff5f5', border: '1.5px solid #fecaca',
                borderRadius: 14, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: '#dc2626', fontWeight: 500,
              }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty State ── */}
        {alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            style={{
              background: '#fff', border: '1.5px dashed #d1d5db',
              borderRadius: 24, padding: '72px 32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: '#eef2ff', border: '1.5px solid #c7d2fe',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, color: ACCENT,
            }}>
              <BellIcon />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              No price alerts yet
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 300, lineHeight: 1.7, marginBottom: 28, fontWeight: 500 }}>
              Search for a product, click "View Details" and set a target price to get notified when it drops.
            </p>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <motion.span
                whileHover={{ scale: 1.04, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', padding: '10px 28px', borderRadius: 12,
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  background: GRAD,
                  boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  cursor: 'pointer',
                }}
              >
                Start Searching
              </motion.span>
            </Link>
          </motion.div>
        ) : (
          // ── Alert Cards ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map((alert, i) => {
              const isBelow = alert.currentPrice && alert.currentPrice <= alert.targetPrice;
              const diff    = alert.currentPrice ? alert.currentPrice - alert.targetPrice : null;

              return (
                <motion.div
                  key={alert._id} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                  style={{
                    background: isBelow ? '#f0fdf4' : !alert.isActive ? '#fafafa' : '#ffffff',
                    border: isBelow
                      ? '1.5px solid #86efac'
                      : !alert.isActive
                      ? '1.5px solid #e5e7eb'
                      : '1.5px solid #e5e7eb',
                    borderRadius: 20,
                    padding: '18px 20px',
                    opacity: !alert.isActive ? 0.65 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isBelow
                      ? '0 2px 12px rgba(16,185,129,0.10)'
                      : '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

                    {/* Left */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        {isBelow && (
                          <span style={{
                            background: '#dcfce7', border: '1px solid #86efac',
                            color: '#16a34a', fontSize: 11, fontWeight: 700,
                            padding: '3px 10px', borderRadius: 999,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <CheckIcon /> Price Reached
                          </span>
                        )}
                        {!isBelow && alert.isTriggered && (
                          <span style={{
                            background: '#eef2ff', border: '1px solid #c7d2fe',
                            color: '#4f46e5', fontSize: 11, fontWeight: 700,
                            padding: '3px 10px', borderRadius: 999,
                          }}>
                            Alert Sent
                          </span>
                        )}
                        {!alert.isActive && (
                          <span style={{
                            background: '#f3f4f6', border: '1px solid #d1d5db',
                            color: '#6b7280', fontSize: 11, fontWeight: 700,
                            padding: '3px 10px', borderRadius: 999,
                          }}>
                            Paused
                          </span>
                        )}
                      </div>

                      {/* Product name */}
                      <p style={{
                        fontSize: 14, fontWeight: 700, color: '#111827',
                        lineHeight: 1.5, marginBottom: 14,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {alert.productName}
                      </p>

                      {/* Data pills */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <DataPill label="Store"  value={alert.store || 'Any'} />
                        <DataPill
                          label="Target"
                          value={`₹${alert.targetPrice.toLocaleString()}`}
                          valueStyle={{ color: '#7c3aed', fontWeight: 800, fontSize: 15 }}
                        />
                        {alert.currentPrice && (
                          <DataPill
                            label="Current Price"
                            value={`₹${alert.currentPrice.toLocaleString()}`}
                            valueStyle={{ color: isBelow ? '#16a34a' : '#111827', fontWeight: 800, fontSize: 15 }}
                            sub={diff !== null ? (diff <= 0 ? `₹${Math.abs(diff).toLocaleString()} under target` : `₹${diff.toLocaleString()} above target`) : null}
                            subColor={diff !== null && diff <= 0 ? '#16a34a' : '#dc2626'}
                          />
                        )}
                        <DataPill label="Created" value={new Date(alert.createdAt).toLocaleDateString('en-IN')} />
                        {alert.lastChecked && (
                          <DataPill
                            label="Last Checked"
                            value={new Date(alert.lastChecked).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <ActionBtn onClick={() => handleCheckNow(alert._id)} disabled={alert.checking} title="Check now"  color="indigo" icon={alert.checking ? <SpinnerIcon /> : <RefreshIcon />} />
                      <ActionBtn onClick={() => handleToggle(alert._id)}   title={alert.isActive ? 'Pause' : 'Resume'}  color="violet" icon={alert.isActive ? <PauseIcon /> : <PlayIcon />} />
                      <ActionBtn onClick={() => handleDelete(alert._id)}   title="Delete"                               color="rose"   icon={<TrashIcon />} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Info Box ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{
            marginTop: 32,
            background: '#eef2ff', border: '1.5px solid #c7d2fe',
            borderRadius: 20, padding: '18px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ color: ACCENT, marginTop: 1, flexShrink: 0 }}><InfoIcon /></div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
                How price alerts work
              </p>
              <ul style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  <>Prices are checked automatically every <strong style={{ color: '#111827' }}>12 hours</strong> (12:00 AM &amp; 12:00 PM IST)</>,
                  <>When price drops to target, an email is sent to <strong style={{ color: '#4f46e5' }}>{user?.email}</strong></>,
                  <>Alerts stay active until you delete or pause them</>,
                  <>Manage all alerts from this page</>,
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: ACCENT, marginTop: 2, fontWeight: 700 }}>›</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const DataPill = ({ label, value, valueStyle = {}, sub, subColor }) => (
  <div style={{
    background: '#f9fafb', border: '1.5px solid #e5e7eb',
    borderRadius: 10, padding: '7px 12px', minWidth: 70,
  }}>
    <p style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>{label}</p>
    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', ...valueStyle }}>{value}</p>
    {sub && <p style={{ fontSize: 10, color: subColor || '#6b7280', marginTop: 2, fontWeight: 600 }}>{sub}</p>}
  </div>
);

const colorMap = {
  indigo: { bg: '#eef2ff',  hover: '#e0e7ff', color: '#4f46e5', border: '#c7d2fe' },
  violet: { bg: '#f5f3ff',  hover: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
  rose:   { bg: '#fff1f2',  hover: '#ffe4e6', color: '#e11d48', border: '#fecdd3' },
};

const ActionBtn = ({ onClick, disabled, title, color, icon }) => {
  const c = colorMap[color];
  return (
    <motion.button
      onClick={onClick} disabled={disabled} title={title}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
      style={{
        width: 34, height: 34, borderRadius: 10,
        border: `1.5px solid ${c.border}`,
        background: c.bg, color: c.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = c.hover; }}
      onMouseLeave={e => { e.currentTarget.style.background = c.bg; }}
    >
      {icon}
    </motion.button>
  );
};

export default PriceAlerts;
