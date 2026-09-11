import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, Calendar, User, Tag, MapPin, Phone, Hash, FileText } from 'lucide-react';

export default function ReceiptModal({ claim, onClose }) {
  if (!claim) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = claim.resolved_at
    ? new Date(claim.resolved_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '650px', padding: 0, overflow: 'hidden', border: '2px solid var(--accent)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Header Banner */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#fff',
            padding: '1.75rem 2rem',
            position: 'relative',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderBottom: '3px solid #f59e0b',
          }}
        >
          <button
            onClick={onClose}
            className="no-print"
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#fbbf24',
                }}
              >
                Official Handover Certificate
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Campus Property Release Receipt
              </h2>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
            FindBack Autonomous Campus Lost & Found System — Security Desk Verification Log
          </p>
        </div>

        {/* Certificate Body */}
        <div style={{ padding: '1.75rem 2rem', backgroundColor: '#fff' }}>
          {/* Top meta strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                RECEIPT NUMBER
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>
                {claim.receipt_number || `REC-2026-${claim.id.substring(0, 6).toUpperCase()}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ISSUED AT
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} color="var(--text-muted)" /> {formattedDate}
              </div>
            </div>
          </div>

          {/* Section: Claimant & Property */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Student Info */}
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} /> Claimant Student Details
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d' }}>{claim.student_name}</div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '0.2rem' }}>
                Enrollment ID: <strong>{claim.student_college_id}</strong>
              </div>
              {claim.student_phone && (
                <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Phone size={12} /> {claim.student_phone}
                </div>
              )}
            </div>

            {/* Property Info */}
            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tag size={14} /> Item Handed Over
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{claim.item_name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Tag size={12} /> {claim.category || 'Personal Property'}
              </div>
              {claim.location_found && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={12} /> Found at: {claim.location_found}
                </div>
              )}
              {claim.found_report_number && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  Desk Log #{claim.found_report_number}
                </div>
              )}
            </div>
          </div>

          {/* Claimant Proof Statement */}
          {claim.proof_description && (
            <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', backgroundColor: '#fafaf9', borderRadius: 'var(--radius-sm)', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FileText size={13} /> Verified Ownership Proof:
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                "{claim.proof_description}"
              </div>
            </div>
          )}

          {/* Admin Handover Notes */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#eff6ff',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #bfdbfe',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={14} /> Security Desk Verification & Audit Notes
            </div>
            <div style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.5 }}>
              {claim.handover_notes || 'Physical identity verified with college photo ID card. Distinguishing marks verified in-person. Item custody successfully transferred to owner.'}
            </div>
          </div>

          {/* Security Officer Verification Stamp */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px dashed var(--border)',
              paddingTop: '1rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              <div>Verified by: <strong>Campus Security Desk</strong></div>
              <div>System Audit ID: <span style={{ fontFamily: 'monospace' }}>{claim.id.substring(0, 16)}</span></div>
            </div>
            <div
              style={{
                border: '2px solid #166534',
                color: '#166534',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                transform: 'rotate(-3deg)',
                textTransform: 'uppercase',
              }}
            >
              ✓ HANDOVER VERIFIED
            </div>
          </div>

          {/* Actions (Hidden during print) */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <button onClick={onClose} className="btn btn-outline">Close</button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
