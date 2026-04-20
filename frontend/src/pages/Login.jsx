import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, createUserProfile } from '../services/firebase';
import toast from 'react-hot-toast';
import { Plane, Users, MapPin, Sparkles, Eye, Shield } from 'lucide-react';


export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginUser(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        const { user } = await registerUser(form.email, form.password);
        await createUserProfile(user.uid, {
          name: form.name,
          email: form.email,
          role: form.role,
        });
        toast.success('Account created!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Dev bypass — skip Firebase and go straight to dashboard
  const handleDevPreview = (role = 'admin') => {
    sessionStorage.setItem('dev_bypass', role);
    window.dispatchEvent(new Event('dev_login'));
    navigate('/dashboard');
    toast.success(`Preview mode: ${role === 'admin' ? 'Admin' : 'Employee'}`);
  };


  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '-200px', left: '-200px', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,229,176,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-200px', right: '-200px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '440px', zIndex: 1 }}>
        
        {/* Logo */}
        <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', background: 'linear-gradient(135deg, var(--teal-500), var(--teal-600))', borderRadius: '20px', marginBottom: '16px', boxShadow: '0 0 40px rgba(0,229,176,0.4)' }}>
            <Plane size={32} color="var(--navy-950)" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px' }}>
            <span className="gradient-text">TripSync</span>
            <span style={{ color: 'var(--text-primary)' }}> AI</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
            Smart group travel companion
          </p>
        </div>

        {/* Features row */}
        <div className="animate-slide-up stagger-1" style={{ display: 'flex', gap: '16px', marginBottom: '32px', justifyContent: 'center' }}>
          {[
            { icon: Users, label: '10–20 people' },
            { icon: MapPin, label: '21 day trips' },
            { icon: Sparkles, label: 'AI powered' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Icon size={13} color="var(--teal-400)" />
              {label}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card animate-slide-up stagger-2" style={{ padding: '32px' }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '28px' }}>
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                fontFamily: 'Inter',
                background: mode === m ? 'linear-gradient(135deg, var(--teal-500), var(--teal-600))' : 'transparent',
                color: mode === m ? 'var(--navy-950)' : 'var(--text-secondary)',
                transition: 'all 0.2s ease',
              }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Full Name</label>
                <input className="input" name="name" placeholder="Rahul Sharma" value={form.name} onChange={handleChange} required />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Email</label>
              <input className="input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Password</label>
              <input className="input" type="password" name="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Role</label>
                <select className="input" name="role" value={form.role} onChange={handleChange}>
                  <option value="user">Member</option>
                  <option value="admin">Admin (Trip Organizer)</option>
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: '8px', justifyContent: 'center' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid var(--navy-950)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? '→ Sign In' : '→ Create Account'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Powered by Google Gemini AI • Firebase
        </p>

        {/* Dev Preview Buttons */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Quick preview (no Firebase needed)</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              id="dev-preview-admin-btn"
              onClick={() => handleDevPreview('admin')}
              style={{
                background: 'none', border: '1px dashed rgba(255,184,48,0.4)', borderRadius: 'var(--radius-md)',
                color: 'var(--amber-400)', fontSize: '11px', cursor: 'pointer', padding: '7px 14px',
                fontFamily: 'Inter', display: 'inline-flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.2s ease',
              }}
            >
              <Shield size={11} /> Admin Preview
            </button>
            <button
              id="dev-preview-employee-btn"
              onClick={() => handleDevPreview('user')}
              style={{
                background: 'none', border: '1px dashed rgba(44,255,204,0.3)', borderRadius: 'var(--radius-md)',
                color: 'var(--teal-400)', fontSize: '11px', cursor: 'pointer', padding: '7px 14px',
                fontFamily: 'Inter', display: 'inline-flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.2s ease',
              }}
            >
              <Users size={11} /> Employee Preview
            </button>
          </div>
        </div>
      </div>


      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
