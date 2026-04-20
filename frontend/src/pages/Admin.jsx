import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrip } from '../context/TripContext';
import { apiGetExpenses, apiApproveExpense, apiRejectExpense, apiGetUsers, apiRegisterUser } from '../services/api';
import { Shield, CheckCircle, XCircle, AlertTriangle, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const { isAdmin, user } = useAuth();
  const { trip } = useTrip();
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ uid: '', name: '', email: '', role: 'user' });

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [expRes, usersRes] = await Promise.all([
        apiGetExpenses({ trip_id: trip.trip_id }),
        apiGetUsers(),
      ]);
      setPending((expRes.data.expenses || []).filter(e => e.status === 'pending'));
      setMembers(usersRes.data.users || []);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try { await apiApproveExpense(id); toast.success('Approved ✅'); loadData(); }
    catch { toast.error('Failed'); }
  };

  const handleReject = async (id) => {
    try { await apiRejectExpense(id); toast.success('Rejected'); loadData(); }
    catch { toast.error('Failed'); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await apiRegisterUser(newUser);
      toast.success(`${newUser.name} added!`);
      setNewUser({ uid: '', name: '', email: '', role: 'user' });
      setShowAddUser(false);
      loadData();
    } catch { toast.error('Failed to add user'); }
  };

  if (!isAdmin) return null;

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(255,184,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="var(--amber-400)" />
          </div>
          <div>
            <h1 className="page-title">Admin <span className="gradient-text-amber">Panel</span></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage approvals and team members</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowAddUser(!showAddUser)}>
          <UserPlus size={14} /> Add Member
        </button>
      </div>

      {/* Alert banner for pending approvals */}
      {pending.length > 0 && (
        <div className="animate-slide-up" style={{ background: 'rgba(255,184,48,0.08)', border: '1px solid rgba(255,184,48,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color="var(--amber-400)" />
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--amber-400)' }}>
            {pending.length} expense{pending.length > 1 ? 's' : ''} awaiting your approval
          </span>
        </div>
      )}

      {/* Add Member Form */}
      {showAddUser && (
        <div className="glass-card animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontWeight: '700', marginBottom: '20px' }}>Add Trip Member</h3>
          <form onSubmit={handleAddUser}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {[
                { name: 'uid', label: 'Firebase UID *', placeholder: 'UID from Firebase Console' },
                { name: 'name', label: 'Name *', placeholder: 'Priya Sharma' },
                { name: 'email', label: 'Email *', placeholder: 'priya@example.com', type: 'email' },
              ].map(({ name, label, placeholder, type = 'text' }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>{label}</label>
                  <input className="input" type={type} placeholder={placeholder} value={newUser[name]} onChange={e => setNewUser({ ...newUser, [e.target.name]: e.target.value })} name={name} required />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '5px', fontWeight: '500' }}>Role</label>
                <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="user">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary"><UserPlus size={14} /> Add Member</button>
          </form>
        </div>
      )}

      <div className="grid-2">
        {/* Approval Queue */}
        <div>
          <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', background: 'var(--amber-400)', borderRadius: '50%', display: 'inline-block' }} />
            Approval Queue ({pending.length})
          </h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1,2].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />)}
            </div>
          ) : pending.length === 0 ? (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
              <CheckCircle size={28} color="var(--green-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No pending approvals!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pending.map(e => (
                <div key={e.id} className="glass-card animate-slide-up" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>₹{e.amount?.toLocaleString()}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {e.paidBy} · <span style={{ textTransform: 'capitalize' }}>{e.category}</span>
                        {e.description && ` · ${e.description}`}
                      </div>
                      {e.proofUrl && (
                        <a href={e.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--teal-400)', display: 'inline-block', marginTop: '4px' }}>
                          📎 View Receipt
                        </a>
                      )}
                    </div>
                    <span className="badge badge-pending">Pending</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(e.id)} style={{ flex: 1, justifyContent: 'center' }}>
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(e.id)} style={{ flex: 1, justifyContent: 'center' }}>
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members List */}
        <div>
          <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={14} color="var(--teal-400)" />
            Group Members ({members.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m, i) => (
              <div key={m.id || i} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy-700), var(--navy-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', color: 'var(--teal-400)', flexShrink: 0 }}>
                  {(m.name || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{m.name || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</div>
                </div>
                <span className={`badge badge-${m.role}`}>{m.role}</span>
              </div>
            ))}
            {members.length === 0 && (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No members registered yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
