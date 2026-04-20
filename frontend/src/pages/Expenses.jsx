import React, { useState, useEffect } from 'react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { apiGetExpenses, apiAddExpense, apiApproveExpense, apiRejectExpense } from '../services/api';
import { addExpense, uploadReceipt } from '../services/firebase';
import ExpenseCard from '../components/ExpenseCard';
import { Plus, Filter, Search, Upload, X, CheckCircle, XCircle, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['all', 'food', 'travel', 'stay', 'activity', 'misc'];

export default function Expenses() {
  const { trip, expenses, setExpenses } = useTrip();
  const { isAdmin, profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ category: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [form, setForm] = useState({ amount: '', paid_by: '', category: 'food', description: '', day: '' });

  useEffect(() => {
    if (profile?.name && !form.paid_by) {
      setForm(prev => ({ ...prev, paid_by: profile.name }));
    }
  }, [profile]);

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    try {
      const res = await apiGetExpenses({ trip_id: trip.trip_id });
      let allExp = res.data.expenses || [];
      if (!isAdmin) {
        allExp = allExp.filter(e => e.paidBy === profile?.name);
      }
      setExpenses(allExp);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.paid_by) return toast.error('Amount and Paid By are required.');
    setSubmitting(true);
    try {
      // In Dev Mode, we use our backend API which handles mock persistence
      await apiAddExpense({
        trip_id: trip.trip_id,
        amount: parseFloat(form.amount),
        paid_by: form.paid_by,
        category: form.category,
        description: form.description,
        day: form.day ? parseInt(form.day) : null,
        proof_url: '', // Receipt upload bypassed in dev mode for stability
      });
      
      toast.success(`₹${form.amount} expense added!`);
      setForm({ amount: '', paid_by: '', category: 'food', description: '', day: '' });
      setReceipt(null);
      setShowForm(false);
      loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add expense');
    } finally { setSubmitting(false); }
  };

  const handleApprove = async (id) => {
    try {
      await apiApproveExpense(id);
      toast.success('Expense approved ✅');
      loadExpenses();
    } catch { toast.error('Failed to approve. Are you an admin?'); }
  };

  const handleReject = async (id) => {
    try {
      await apiRejectExpense(id);
      toast.success('Expense rejected');
      loadExpenses();
    } catch { toast.error('Failed to reject. Are you an admin?'); }
  };

  const filtered = expenses.filter(e => {
    const catOk = filter.category === 'all' || e.category === filter.category;
    const searchOk = !filter.search || e.paidBy?.toLowerCase().includes(filter.search.toLowerCase()) || e.description?.toLowerCase().includes(filter.search.toLowerCase());
    return catOk && searchOk;
  });

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Expenses <span className="gradient-text">Tracker</span></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{filtered.length} expenses • Total: ₹{total.toLocaleString()}</p>
        </div>
        <button className="btn btn-primary" id="add-expense-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Expense</>}
        </button>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '20px' }}>New Expense</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Amount (₹) *</label>
                <input className="input" type="number" placeholder="1200" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Paid By *</label>
                <input className="input" placeholder="Rahul" value={form.paid_by} onChange={e => setForm({ ...form, paid_by: e.target.value })} required disabled={!isAdmin} style={{ opacity: !isAdmin ? 0.7 : 1, cursor: !isAdmin ? 'not-allowed' : 'text' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Category</label>
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {['food', 'travel', 'stay', 'activity', 'misc'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Day #</label>
                <input className="input" type="number" placeholder="1" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} min="1" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Description</label>
                <input className="input" placeholder="Lunch at Café Roma" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Receipt (optional)</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Upload size={14} color="var(--teal-400)" />
                  {receipt ? receipt.name : 'Upload receipt image'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setReceipt(e.target.files[0])} />
                </label>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : <><Receipt size={14} /> Add Expense</>}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card animate-slide-up" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px' }}>
          <Search size={14} color="var(--text-muted)" />
          <input className="input" placeholder="Search by person or item..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} style={{ border: 'none', background: 'none', padding: '4px 0', flex: 1, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter({ ...filter, category: cat })} style={{
              padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: 'none', fontFamily: 'Inter',
              background: filter.category === cat ? 'var(--teal-500)' : 'rgba(255,255,255,0.05)',
              color: filter.category === cat ? 'var(--navy-950)' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <Receipt size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No expenses found. Add your first one!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((expense, i) => (
            <ExpenseCard key={expense.id} expense={expense} isAdmin={isAdmin} onApprove={handleApprove} onReject={handleReject} delay={Math.min(i + 1, 4)} />
          ))}
        </div>
      )}
    </div>
  );
}
