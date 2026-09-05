import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Sparkles, Shield, GraduationCap, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '', college_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickLogin = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(formData.email, formData.password);
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
      } else {
        await register({ ...formData, role: 'student' });
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '920px', width: '100%', display: 'grid', gridTemplateColumns: '1.1fr 1fr', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* Left: Branding + Quick Demo */}
        <div style={{ backgroundColor: 'var(--primary)', color: '#fff', padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                <Compass size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>FindBack</h1>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Smart College Lost & Found</p>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '2rem' }}>
              Lost something on campus? FindBack uses AI to automatically match your lost item report against items turned in to campus security.
            </p>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                <Sparkles size={16} /> Quick Demo Login
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Student — Aarav Sharma', sub: '0012026 · Has AI match for headphones', email: 'student1@college.edu', pw: 'Student@123', icon: <GraduationCap size={16} color="#38bdf8" />, color: '#38bdf8' },
                  { label: 'Student — Priya Patel', sub: '0022026 · Has match for calculator', email: 'student2@college.edu', pw: 'Student@123', icon: <GraduationCap size={16} color="#4ade80" />, color: '#4ade80' },
                  { label: 'Student — Rohan Verma', sub: '0032026 · Submitted a found item report', email: 'student3@college.edu', pw: 'Student@123', icon: <GraduationCap size={16} color="#c084fc" />, color: '#c084fc' },
                  { label: 'Campus Admin', sub: 'Approve items, verify claims', email: 'admin@college.edu', pw: 'Admin@123', icon: <Shield size={16} color="#fbbf24" />, color: '#fbbf24' },
                ].map((d) => (
                  <button key={d.email} type="button" onClick={() => quickLogin(d.email, d.pw)} disabled={loading}
                    className="demo-pill-btn" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {d.icon}
                      <div><div>{d.label}</div><div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{d.sub}</div></div>
                    </div>
                    <ArrowRight size={14} color={d.color} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1.5rem' }}>Prototype V2 · Pre-seeded with realistic data</div>
        </div>

        {/* Right: Auth Form */}
        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.75rem' }}>
            {['login', 'register'].map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: mode === m ? '#fff' : 'transparent', fontWeight: 600, fontSize: '0.85rem', color: mode === m ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', boxShadow: mode === m ? 'var(--shadow-sm)' : 'none' }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {mode === 'login' ? 'Sign in with your college email.' : 'Register to report or claim lost items.'}
          </p>

          {error && <div style={{ padding: '0.75rem', backgroundColor: 'var(--rose-subtle)', color: 'var(--rose-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" className="form-input" placeholder="e.g. Rohan Verma" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Enrollment Number *</label>
                  <input type="text" className="form-input" placeholder="e.g. 0042026" value={formData.college_id} onChange={(e) => setFormData({ ...formData, college_id: e.target.value })} required />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">College Email *</label>
              <input type="email" className="form-input" placeholder="you@college.edu" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" placeholder="--------" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
