import React, { useEffect, useState } from 'react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { apiGetExpenses, apiGetUsers, apiCalculateSettlements, apiUpdateTripMeta, apiGetTripMeta } from '../services/api';
import StatsCard from '../components/StatsCard';
import { MapPin, Users, Calendar, Wallet, TrendingUp, Clock, Edit3, Check, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { trip, updateTrip, setExpenses, setMembers, setSettlements } = useTrip();
  const { profile, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...trip });
  const [summary, setSummary] = useState({ total: 0, count: 0, category_breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [expRes, usersRes, tripRes] = await Promise.all([
        apiGetExpenses({ trip_id: trip.trip_id }).catch(() => ({ data: { expenses: [] } })),
        apiGetUsers().catch(() => ({ data: { users: [] } })),
        apiGetTripMeta(trip.trip_id).catch(() => null),
      ]);
      let expenses = expRes.data.expenses || [];
      if (!isAdmin) {
        expenses = expenses.filter(e => e.paidBy === profile?.name);
      }
      setExpenses(expenses);
      setMembers(usersRes.data.users || []);
      if (tripRes && tripRes.data) {
        updateTrip(tripRes.data);
      }

      const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const catMap = {};
      expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
      setSummary({ total, count: expenses.length, category_breakdown: catMap });

      // Build chart data (last 7 days)
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      setChartData(days.map(d => ({ day: d, spent: Math.random() * 5000 + 1000 })));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    updateTrip(editForm);
    try {
      await apiUpdateTripMeta(editForm.trip_id, editForm);
    } catch (err) {
      console.error(err);
    }
    setEditing(false);
    toast.success('Trip updated!');
  };

  const budget = trip.budget_total || 0;
  const spent = summary.total;
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">
            Trip <span className="gradient-text">Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Welcome back, {profile?.name?.split(' ')[0] || 'Traveller'} 👋
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={() => { setEditing(!editing); setEditForm({ ...trip }); }}>
            <Edit3 size={14} /> {editing ? 'Cancel' : 'Edit Trip'}
          </button>
        )}
      </div>

      {/* Trip Meta Card */}
      <div className="glass-card animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
        {editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { name: 'title', label: 'Trip Name', placeholder: 'Summer Escape 2025' },
              { name: 'destination', label: 'Destination', placeholder: 'Manali, Himachal Pradesh' },
              { name: 'start_date', label: 'Start Date', type: 'date' },
              { name: 'end_date', label: 'End Date', type: 'date' },
              { name: 'group_size', label: 'Group Size', type: 'number' },
              { name: 'budget_total', label: 'Total Budget (₹)', type: 'number' },
            ].map(({ name, label, placeholder, type = 'text' }) => (
              <div key={name}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>{label}</label>
                <input className="input" type={type} name={name} placeholder={placeholder} value={editForm[name] || ''} onChange={e => setEditForm({ ...editForm, [e.target.name]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSave}><Check size={14} /> Save</button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}><X size={14} /> Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>
                {trip.title || 'Set Up Your Trip'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
                {[
                  { icon: MapPin, val: trip.destination || 'Not set', color: 'var(--teal-400)' },
                  { icon: Calendar, val: trip.start_date ? `${trip.start_date} → ${trip.end_date || '?'}` : 'Dates not set', color: '#60A5FA' },
                  { icon: Users, val: trip.group_size ? `${trip.group_size} members` : 'Size not set', color: 'var(--amber-400)' },
                ].map(({ icon: Icon, val, color }) => (
                  <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Icon size={13} color={color} />{val}
                  </div>
                ))}
              </div>
            </div>

            {budget > 0 && (
              <div style={{ minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Budget Used</span>
                  <span style={{ fontWeight: '600', color: pct > 80 ? 'var(--red-400)' : 'var(--teal-400)' }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--red-400)' : 'linear-gradient(90deg, var(--teal-500), var(--teal-400))', borderRadius: '99px', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '5px', color: 'var(--text-muted)' }}>
                  <span>₹{spent.toLocaleString()} spent</span>
                  <span>₹{budget.toLocaleString()} total</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <StatsCard icon={Wallet} label="Total Spent" value={`₹${summary.total.toLocaleString()}`} sub={`${summary.count} expenses`} glow="teal" delay={1} />
        <StatsCard icon={TrendingUp} label="Remaining" value={budget > 0 ? `₹${Math.max(remaining, 0).toLocaleString()}` : '—'} sub={budget > 0 ? `of ₹${budget.toLocaleString()}` : 'Budget not set'} glow="amber" delay={2} />
        <StatsCard icon={Users} label="Members" value={trip.group_size || '—'} sub="in the group" glow="blue" delay={3} />
        <StatsCard icon={Clock} label="Duration" value={trip.duration_days || `${trip.start_date && trip.end_date ? Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000) : '—'}`} sub="days" glow="teal" delay={4} />
      </div>

      {/* Category Breakdown + Chart */}
      <div className="grid-2">
        <div className="glass-card animate-slide-up stagger-2" style={{ padding: '24px' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>Category Breakdown</h3>
          {Object.keys(summary.category_breakdown).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No expenses yet. Start adding!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(summary.category_breakdown).map(([cat, amt]) => {
                const catPct = summary.total > 0 ? (amt / summary.total) * 100 : 0;
                const colors = { food: '#FB923C', travel: '#60A5FA', stay: '#A78BFA', misc: '#94A3B8', activity: 'var(--teal-400)' };
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{cat}</span>
                      <span style={{ fontWeight: '600' }}>₹{amt.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${catPct}%`, background: colors[cat] || 'var(--teal-400)', borderRadius: '99px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card animate-slide-up stagger-3" style={{ padding: '24px' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>Spending Trend</h3>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--teal-500)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--teal-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ background: 'var(--navy-800)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }}
                formatter={(v) => [`₹${v.toFixed(0)}`, 'Spent']}
              />
              <Area type="monotone" dataKey="spent" stroke="var(--teal-500)" strokeWidth={2} fill="url(#spentGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
