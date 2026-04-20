import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/firebase';
import { Plane, LayoutDashboard, Receipt, Map, BarChart3, Shield, LogOut, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/itinerary',  icon: Map,             label: 'Itinerary'  },
  { to: '/expenses',   icon: Receipt,         label: 'Expenses'   },
  { to: '/settlements',icon: BarChart3,       label: 'Settlements'},
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Signal AuthContext to clear user state (handles dev bypass mode)
    window.dispatchEvent(new Event('dev_logout'));
    // Clear dev bypass from session
    sessionStorage.removeItem('dev_bypass');
    // Sign out from Firebase (no-op if not logged in via Firebase)
    try { await logoutUser(); } catch (_) {}
    toast.success('Signed out');
    navigate('/');
  };

  return (
    <nav style={{
      width: '240px', minHeight: '100vh', background: 'var(--navy-900)',
      borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column',
      padding: '24px 0', position: 'fixed', left: 0, top: 0, zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--glass-border)' }}>
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--teal-500), var(--teal-600))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plane size={18} color="var(--navy-950)" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>TripSync</div>
            <div style={{ fontSize: '10px', color: 'var(--teal-400)', fontWeight: '600', marginTop: '-2px' }}>AI COMPANION</div>
          </div>
        </Link>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', fontWeight: active ? '600' : '400', fontSize: '14px',
              color: active ? 'var(--teal-400)' : 'var(--text-secondary)',
              background: active ? 'rgba(44,255,204,0.08)' : 'transparent',
              border: active ? '1px solid rgba(44,255,204,0.15)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}>
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
            </Link>
          );
        })}

        {isAdmin && (
          <Link to="/admin" style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', fontWeight: pathname === '/admin' ? '600' : '400', fontSize: '14px',
            color: pathname === '/admin' ? 'var(--amber-400)' : 'var(--text-secondary)',
            background: pathname === '/admin' ? 'rgba(255,184,48,0.08)' : 'transparent',
            border: pathname === '/admin' ? '1px solid rgba(255,184,48,0.15)' : '1px solid transparent',
            transition: 'all 0.2s ease', marginTop: '8px',
          }}>
            <Shield size={16} />
            Admin Panel
            <span className="badge badge-admin" style={{ marginLeft: 'auto', fontSize: '9px', padding: '2px 6px' }}>ADMIN</span>
          </Link>
        )}
      </div>

      {/* User Profile */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy-700), var(--navy-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', color: 'var(--teal-400)', flexShrink: 0 }}>
            {(profile?.name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name || 'User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {isAdmin ? '👑 Admin' : '👤 Member'}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
