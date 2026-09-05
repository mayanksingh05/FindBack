import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportService, matchService } from '../services/api';
import MatchModal from '../components/MatchModal';
import { Sparkles, Clock, CheckCircle2, MapPin, Tag, PlusCircle, AlertCircle, FileText, PackageCheck, ArrowRight } from 'lucide-react';

export default function StudentDashboard({ onOpenReport }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('matches');
  const [lostReports, setLostReports] = useState([]);
  const [foundReports, setFoundReports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lost, found, m, c] = await Promise.all([
        reportService.getLostReports(true),
        reportService.getFoundReports({ mine: true }),
        matchService.getMatches(),
        matchService.getClaims(),
      ]);
      setLostReports(lost);
      setFoundReports(found);
      setMatches(m);
      setClaims(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const tabs = [
    { key: 'matches', label: 'AI Matches', count: matches.length, icon: <Sparkles size={18} />, accent: 'var(--accent)' },
    { key: 'lost', label: 'My Lost Reports', count: lostReports.length, icon: <FileText size={18} /> },
    { key: 'found', label: 'My Found Reports', count: foundReports.length, icon: <PackageCheck size={18} /> },
    { key: 'claims', label: 'Verification Requests', count: claims.length, icon: <CheckCircle2 size={18} /> },
  ];

  const statusBadge = (s) => {
    const map = {
      'ACTIVE': 'badge-rose', 'MATCHED': 'badge-amber', 'RESOLVED': 'badge-emerald',
      'PENDING_APPROVAL': 'badge-amber', 'AT_SECURITY_DESK': 'badge-blue', 'RETURNED_TO_OWNER': 'badge-emerald',
      'PENDING_VERIFICATION': 'badge-amber', 'VERIFIED': 'badge-emerald', 'FAILED': 'badge-rose',
    };
    const label = {
      'PENDING_APPROVAL': 'Awaiting Admin Approval',
      'AT_SECURITY_DESK': 'At Security Desk',
      'RETURNED_TO_OWNER': 'Returned',
      'PENDING_VERIFICATION': 'Pending Verification',
      'VERIFIED': 'Verified & Collected',
      'FAILED': 'Verification Failed',
    };
    return <span className={`badge ${map[s] || 'badge-slate'}`}>{label[s] || s}</span>;
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      {/* Welcome */}
      <div style={{ backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>Welcome, {user?.name}</h1>
            <span className="badge badge-blue">{user?.college_id}</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Track lost items, review AI matches, and manage your found item submissions.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onOpenReport('lost')} className="btn btn-primary"><PlusCircle size={18} /> Report Lost</button>
          <button onClick={() => onOpenReport('found')} className="btn btn-outline"><PlusCircle size={18} /> Report Found</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'LOST REPORTS', value: lostReports.length, sub: `${lostReports.filter(r => r.status === 'ACTIVE').length} active`, icon: <FileText size={18} color="var(--rose)" /> },
          { label: 'AI MATCHES', value: matches.length, sub: 'Items to review', icon: <Sparkles size={18} color="var(--accent)" />, highlight: matches.length > 0 },
          { label: 'FOUND SUBMISSIONS', value: foundReports.length, sub: `${foundReports.filter(r => r.status === 'PENDING_APPROVAL').length} pending approval`, icon: <PackageCheck size={18} color="var(--blue)" /> },
          { label: 'CLAIMS', value: claims.length, sub: `${claims.filter(c => c.status === 'PENDING_VERIFICATION').length} awaiting visit`, icon: <CheckCircle2 size={18} color="var(--emerald)" /> },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '1.25rem', border: s.highlight ? '1px solid var(--accent)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{s.label}</span>{s.icon}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.highlight ? 'var(--accent)' : 'var(--primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === t.key ? `3px solid ${t.accent || 'var(--primary)'}` : '3px solid transparent', marginBottom: '-2px', fontWeight: 700, fontSize: '0.9rem', color: activeTab === t.key ? (t.accent || 'var(--primary)') : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          {/* AI MATCHES */}
          {activeTab === 'matches' && (
            matches.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <AlertCircle size={40} color="var(--text-light)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Matches Yet</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>When an item at the security desk matches your lost report, it will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                {matches.map((m) => {
                  const pct = Math.round((m.combined_score || 0) * 100);
                  return (
                    <div key={m.id} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div className="ai-score-pill"><Sparkles size={14} color="#fbbf24" /> <span className="score-number">{pct}%</span></div>
                        <span className="badge badge-amber">{m.found_report?.category}</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>{m.found_report?.item_name}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={13} /> {m.found_report?.location_found}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}><Clock size={13} /> For: #{m.lost_report?.report_number} ({m.lost_report?.item_name})</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--accent-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent-text)', lineHeight: 1.4, marginBottom: '1rem' }}>{m.explanation}</div>
                      <button onClick={() => setSelectedMatch(m)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        Inspect Match & Request Verification <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* LOST REPORTS */}
          {activeTab === 'lost' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Report #</th><th>Item</th><th>Category</th><th>Location</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {lostReports.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No lost items reported yet.</td></tr> :
                    lostReports.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.report_number}</td>
                        <td style={{ fontWeight: 600 }}>{r.item_name}</td>
                        <td><span className="badge badge-slate">{r.category}</span></td>
                        <td>{r.location || (r.location_unknown ? 'Unknown' : '-')}</td>
                        <td>{r.date_lost || '-'}</td>
                        <td>{statusBadge(r.status)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* FOUND REPORTS (student's own submissions) */}
          {activeTab === 'found' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Items you reported finding. Once you submit the item to the security desk and admin approves, it appears in the public catalog.
              </p>
              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>Report #</th><th>Item</th><th>Category</th><th>Where Found</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {foundReports.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>You haven't reported any found items yet.</td></tr> :
                      foundReports.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.report_number}</td>
                          <td style={{ fontWeight: 600 }}>{r.item_name}</td>
                          <td><span className="badge badge-slate">{r.category}</span></td>
                          <td>{r.location_found}</td>
                          <td>{r.date_found || '-'}</td>
                          <td>{statusBadge(r.status)}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CLAIMS */}
          {activeTab === 'claims' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Claim</th><th>Item</th><th>Match Score</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>
                  {claims.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No verification requests yet.</td></tr> :
                    claims.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace' }}>#{c.id.substring(0, 8)}</td>
                        <td style={{ fontWeight: 600 }}>{c.item_name}</td>
                        <td>{c.combined_score ? <div className="ai-score-pill"><span className="score-number">{Math.round(c.combined_score * 100)}%</span></div> : '-'}</td>
                        <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
                        <td>{statusBadge(c.status)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selectedMatch && <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} onClaimSuccess={() => loadData()} userRole="student" />}
    </div>
  );
}
