import React, { useState, useEffect } from 'react';
import { useTrip } from '../context/TripContext';
import { apiCalculateSettlements, apiMarkSettled } from '../services/api';
import { BarChart3, ArrowRight, RefreshCw, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['var(--teal-400)', '#60A5FA', 'var(--amber-400)', '#A78BFA', '#FB923C', '#34D399', '#F472B6'];

export default function Settlements() {
  const { trip, settlements, setSettlements } = useTrip();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await apiCalculateSettlements(trip.trip_id);
      setSettlements(res.data.settlements || []);
      setSummary(res.data.summary || null);
      setCalculated(true);
      toast.success('Settlements calculated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to calculate settlements');
    } finally { setLoading(false); }
  };

  const markSettled = async (s) => {
    try {
      await apiMarkSettled(trip.trip_id, s);
      setSettlements(prev => prev.map(x => x.from === s.from && x.to === s.to ? { ...x, settled: true } : x));
      toast.success('Marked as paid ✅');
    } catch { toast.error('Failed to update'); }
  };

  const pieData = summary?.category_breakdown
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const pending = settlements.filter(s => !s.settled);
  const done = settlements.filter(s => s.settled);

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Smart <span className="gradient-text">Settlements</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Optimized debt resolution for your group
          </p>
        </div>
        <button className="btn btn-primary" id="calculate-settlements-btn" onClick={calculate} disabled={loading}>
          {loading ? (
            <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Calculating...</>
          ) : (
            <><BarChart3 size={14} /> {calculated ? 'Recalculate' : 'Calculate Splits'}</>
          )}
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid-4 animate-slide-up" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Spent', value: `₹${summary.total?.toLocaleString()}`, sub: `${summary.count} expenses` },
            { label: 'Per Person Share', value: `₹${summary.per_person?.toLocaleString()}`, sub: 'equal split' },
            { label: 'Highest Spender', value: summary.highest_spender || '—', sub: `₹${summary.highest_spender_amount?.toLocaleString()}` },
            { label: 'Transactions', value: settlements.length, sub: `${done.length} settled` },
          ].map(({ label, value, sub }, i) => (
            <div key={i} className="glass-card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2">
        {/* Settlement List */}
        <div>
          {!calculated ? (
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
              <BarChart3 size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Ready to split?</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Click "Calculate Splits" to see who owes whom.</p>
            </div>
          ) : settlements.length === 0 ? (
            <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
              <CheckCircle size={40} color="var(--green-400)" style={{ margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: 'var(--green-400)', fontSize: '15px', fontWeight: '600' }}>All settled!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No transfers needed.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                ⏳ Pending ({pending.length})
              </h3>
              {pending.map((s, i) => (
                <div key={i} className="glass-card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,71,87,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', color: 'var(--red-400)', flexShrink: 0 }}>
                    {(s.from || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: '14px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--red-400)' }}>{s.from}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                    <span style={{ fontWeight: '700', color: 'var(--green-400)' }}>{s.to}</span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>₹{s.amount?.toLocaleString()}</span>
                  <button className="btn btn-success btn-sm" onClick={() => markSettled(s)}>Mark Paid</button>
                </div>
              ))}

              {done.length > 0 && (
                <>
                  <h3 style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '4px' }}>
                    ✅ Settled ({done.length})
                  </h3>
                  {done.map((s, i) => (
                    <div key={i} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
                      <CheckCircle size={16} color="var(--green-400)" />
                      <span style={{ flex: 1, fontSize: '13px' }}>{s.from} → {s.to}</span>
                      <span style={{ fontWeight: '700' }}>₹{s.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="glass-card animate-slide-up stagger-2" style={{ padding: '24px' }}>
            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '14px' }}>Spending by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }}
                  formatter={(v) => [`₹${v.toLocaleString()}`, '']}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>

            {summary?.participant_spending && (
              <div style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>Per Person Spending</div>
                {Object.entries(summary.participant_spending).map(([name, amt]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
                    <span style={{ fontWeight: '600' }}>₹{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
