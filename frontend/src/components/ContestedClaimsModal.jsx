import React from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2, User, Phone, Calendar, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';

export default function ContestedClaimsModal({ foundReportId, itemName, claims, onClose, onVerifyClaim }) {
  if (!claims || claims.length === 0) return null;

  const competingClaims = claims.filter(
    (c) => c.found_report_id === foundReportId && c.status === 'PENDING_VERIFICATION'
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '960px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            backgroundColor: '#fffbeb',
            borderBottom: '2px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                  Contested Item Investigation
                </h3>
                <span className="badge badge-amber">{competingClaims.length} Competing Claimants</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#b45309', margin: '0.2rem 0 0' }}>
                Item: <strong>{itemName}</strong> — Compare proof submissions to determine the legitimate owner.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Notice banner */}
        <div style={{ padding: '0.85rem 1.75rem', backgroundColor: '#eff6ff', borderBottom: '1px solid #bfdbfe', fontSize: '0.82rem', color: '#1e40af' }}>
          💡 <strong>Anti-Fraud Automated Resolution</strong>: When you verify the confirmed owner, the system will automatically issue their receipt and auto-reject competing claims with notification.
        </div>

        {/* Side-by-side comparison grid */}
        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: `repeat(${Math.min(competingClaims.length, 3)}, 1fr)`, gap: '1.25rem' }}>
          {competingClaims.map((claim, idx) => {
            const scorePct = claim.combined_score ? Math.round(claim.combined_score * 100) : null;
            return (
              <div
                key={claim.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '2px solid var(--border)',
                  backgroundColor: '#fff',
                }}
              >
                {/* Claimant header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="badge badge-blue">Claimant #{idx + 1}</span>
                  {scorePct && (
                    <div className="ai-score-pill">
                      <Sparkles size={12} color="#fbbf24" />
                      <span className="score-number">{scorePct}%</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--primary)' }}>
                    {claim.student_name}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ID: <strong>{claim.student_college_id}</strong>
                  </div>
                  {claim.student_phone && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <Phone size={12} /> {claim.student_phone}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                    <Calendar size={12} /> Claimed {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : 'recently'}
                  </div>
                </div>

                {/* Proof statement */}
                <div style={{ flex: 1, marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ShieldCheck size={14} /> Distinctive Proof Statement:
                  </div>
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.82rem',
                      color: '#14532d',
                      lineHeight: 1.4,
                      minHeight: '80px',
                    }}
                  >
                    {claim.proof_description || 'No detailed statement provided.'}
                  </div>
                </div>

                {/* Counter-proof image thumbnail */}
                {claim.proof_image_path ? (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ImageIcon size={12} /> Student Counter-Proof (Bill/Box):
                    </div>
                    <a href={claim.proof_image_path} target="_blank" rel="noreferrer">
                      <img
                        src={claim.proof_image_path}
                        alt="Proof"
                        style={{
                          width: '100%',
                          height: '110px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          border: '2px solid #86efac',
                          cursor: 'pointer',
                        }}
                      />
                    </a>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-light)',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    No counter-photo uploaded
                  </div>
                )}

                {/* Verify CTA */}
                <button
                  onClick={() => onVerifyClaim(claim.id)}
                  className="btn btn-success"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <CheckCircle2 size={16} /> Verify & Release to {claim.student_name.split(' ')[0]}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
