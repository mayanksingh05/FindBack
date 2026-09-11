import React, { useState, useEffect } from 'react';
import { reportService, matchService } from '../services/api';
import { Shield, Package, CheckCircle2, XCircle, PlusCircle, UserCheck, Clock, Inbox, Image as ImageIcon, Phone, ShieldCheck, FileCheck } from 'lucide-react';

export default function AdminDashboard({ onOpenReport }) {
  const [activeTab, setActiveTab] = useState('verification');
  const [claims, setClaims] = useState([]);
  const [foundReports, setFoundReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, f] = await Promise.all([matchService.getClaims(), reportService.getFoundReports()]);
      setClaims(c);
      setFoundReports(f);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleClaimAction = async (claimId, newStatus) => {
    try {
      await matchService.updateClaimStatus(claimId, newStatus);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Action failed'); }
  };

  const handleApproveFound = async (reportId) => {
    try {
      await reportService.approveFoundReport(reportId);
      loadData();
    } catch (err) { alert(err.response?.data?.detail || 'Approval failed'); }
  };

  const pendingClaims = claims.filter(c => c.status === 'PENDING_VERIFICATION');
  const resolvedClaims = claims.filter(c => c.status !== 'PENDING_VERIFICATION');
  const pendingFound = foundReports.filter(r => r.status === 'PENDING_APPROVAL');
  const approvedFound = foundReports.filter(r => r.status !== 'PENDING_APPROVAL');

  const statusBadge = (s) => {
    const map = { 'PENDING_APPROVAL': 'badge-amber', 'AT_SECURITY_DESK': 'badge-blue', 'RETURNED_TO_OWNER': 'badge-emerald', 'PENDING_VERIFICATION': 'badge-amber', 'VERIFIED': 'badge-emerald', 'FAILED': 'badge-rose' };
    const label = { 'PENDING_APPROVAL': 'Pending Approval', 'AT_SECURITY_DESK': 'At Security Desk', 'RETURNED_TO_OWNER': 'Returned', 'PENDING_VERIFICATION': 'Awaiting Visit', 'VERIFIED': 'Verified', 'FAILED': 'Failed' };
    return <span className={`badge ${map[s] || 'badge-slate'}`}>{label[s] || s}</span>;
  };

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>Admin Console</h1>
            <span className="badge badge-amber">Security Desk</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Approve found items, verify student ownership claims, and manage the campus inventory.</p>
        </div>
        <button onClick={() => onOpenReport('found')} className="btn btn-accent"><PlusCircle size={18} /> Log Item Received</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'PENDING APPROVALS', value: pendingFound.length, sub: 'Found items to review', icon: <Inbox size={18} color="var(--accent)" />, highlight: pendingFound.length > 0 },
          { label: 'VERIFICATION REQUESTS', value: pendingClaims.length, sub: 'Students waiting to collect', icon: <UserCheck size={18} color="var(--blue)" />, highlight: pendingClaims.length > 0 },
          { label: 'AT SECURITY DESK', value: approvedFound.filter(r => r.status === 'AT_SECURITY_DESK').length, sub: 'Items in safe keeping', icon: <Package size={18} color="#8b5cf6" /> },
          { label: 'RETURNED', value: claims.filter(c => c.status === 'VERIFIED').length, sub: 'Successfully handed over', icon: <CheckCircle2 size={18} color="var(--emerald)" /> },
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
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { key: 'verification', label: `Verification Queue (${pendingClaims.length})`, icon: <UserCheck size={18} /> },
          { key: 'pending', label: `Pending Found Items (${pendingFound.length})`, icon: <Inbox size={18} /> },
          { key: 'inventory', label: `Desk Inventory (${approvedFound.length})`, icon: <Package size={18} /> },
          { key: 'history', label: `Resolved (${resolvedClaims.length})`, icon: <CheckCircle2 size={18} /> },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === t.key ? '3px solid var(--accent)' : '3px solid transparent', marginBottom: '-2px', fontWeight: 700, fontSize: '0.9rem', color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          {/* VERIFICATION QUEUE */}
          {activeTab === 'verification' && (
            <div>
              {pendingClaims.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <UserCheck size={40} color="var(--text-light)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Pending Verifications</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>When a student requests verification for a matched item, it appears here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingClaims.map((c) => (
                    <div key={c.id} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{c.student_college_id}</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{c.student_name}</span>
                            {c.student_phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                                <Phone size={13} /> {c.student_phone}
                              </span>
                            )}
                            {c.combined_score && <div className="ai-score-pill" style={{ marginLeft: '0.5rem' }}><span className="score-number">{Math.round(c.combined_score * 100)}%</span> match</div>}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            <strong>Claims:</strong> {c.item_name}
                            {c.lost_item_name && <> | <strong>Lost report:</strong> {c.lost_item_name}</>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            <Clock size={13} /> Submitted {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'today'}
                          </div>

                          {/* Claimant Proof Statement */}
                          {c.proof_description && (
                            <div style={{ margin: '0.75rem 0', padding: '0.75rem 1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-sm)', border: '1px solid #bbf7d0' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                                <ShieldCheck size={14} /> Claimant's Ownership Proof:
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#14532d', whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                                {c.proof_description}
                              </div>
                            </div>
                          )}

                          {/* Images row */}
                          {(c.lost_image || c.found_image || c.proof_image_path) && (
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                              {c.lost_image && (
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}><ImageIcon size={11} /> Lost item photo</div>
                                  <a href={c.lost_image} target="_blank" rel="noreferrer">
                                    <img src={c.lost_image} alt="Lost" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                                  </a>
                                </div>
                              )}
                              {c.found_image && (
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}><ImageIcon size={11} /> Found item photo</div>
                                  <a href={c.found_image} target="_blank" rel="noreferrer">
                                    <img src={c.found_image} alt="Found" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                                  </a>
                                </div>
                              )}
                              {c.proof_image_path && (
                                <div>
                                  <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600, marginBottom: '0.2rem' }}><FileCheck size={11} /> Counter-Proof (Bill/Box)</div>
                                  <a href={c.proof_image_path} target="_blank" rel="noreferrer">
                                    <img src={c.proof_image_path} alt="Proof" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid #86efac' }} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'center' }}>
                          <button onClick={() => handleClaimAction(c.id, 'VERIFIED')} className="btn btn-success btn-sm">
                            <CheckCircle2 size={14} /> Verified
                          </button>
                          <button onClick={() => handleClaimAction(c.id, 'FAILED')} className="btn btn-danger btn-sm">
                            <XCircle size={14} /> Failed
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PENDING FOUND ITEMS */}
          {activeTab === 'pending' && (
            <div>
              {pendingFound.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <Inbox size={40} color="var(--text-light)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Pending Submissions</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>When students report finding an item, it appears here for your approval.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {pendingFound.map((r) => (
                    <div key={r.id} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            {statusBadge(r.status)}
                            <span className="badge badge-slate">{r.category}</span>
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>{r.item_name}</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{r.description}</p>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                            Found at: {r.location_found} | Submitted by: <strong>{r.submitted_by_name}</strong> ({r.submitted_by_college_id}) | #{r.report_number}
                          </div>
                          {r.image_path && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <img src={r.image_path} alt="Found item" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleApproveFound(r.id)} className="btn btn-accent" style={{ alignSelf: 'center' }}>
                          <CheckCircle2 size={16} /> Approve — Item Received
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DESK INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Report #</th><th>Item</th><th>Category</th><th>Where Found</th><th>Date</th><th>Submitted By</th><th>Status</th></tr></thead>
                <tbody>
                  {approvedFound.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No items in inventory.</td></tr> :
                    approvedFound.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.report_number}</td>
                        <td style={{ fontWeight: 600 }}>{r.item_name}</td>
                        <td><span className="badge badge-slate">{r.category}</span></td>
                        <td>{r.location_found}</td>
                        <td>{r.date_found || '-'}</td>
                        <td>{r.submitted_by_name || 'Admin'} <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>({r.submitted_by_college_id || 'Staff'})</span></td>
                        <td>{statusBadge(r.status)}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* RESOLVED HISTORY */}
          {activeTab === 'history' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Student</th><th>Enrollment</th><th>Item Claimed</th><th>Match %</th><th>Date</th><th>Result</th></tr></thead>
                <tbody>
                  {resolvedClaims.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No resolved claims yet.</td></tr> :
                    resolvedClaims.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.student_name}</td>
                        <td><span className="badge badge-blue">{c.student_college_id}</span></td>
                        <td>{c.item_name}</td>
                        <td>{c.combined_score ? `${Math.round(c.combined_score * 100)}%` : '-'}</td>
                        <td>{c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : '-'}</td>
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
    </div>
  );
}
