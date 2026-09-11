import React, { useState } from 'react';
import { reportService, matchService } from '../services/api';
import { X, Sparkles, CheckCircle2, MapPin, Calendar, Tag, Image as ImageIcon, Phone, FileText, Upload, ShieldCheck, AlertCircle } from 'lucide-react';

export default function MatchModal({ match, onClose, onClaimSuccess, userRole = 'student' }) {
  const [submitting, setSubmitting] = useState(false);
  const [claimed, setClaimed] = useState(match?.status === 'CLAIM_PENDING' || match?.status === 'VERIFIED');
  const [studentPhone, setStudentPhone] = useState('');
  const [proofDescription, setProofDescription] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [error, setError] = useState('');

  if (!match) return null;
  const { lost_report, found_report } = match;
  const scorePercent = Math.round((match.combined_score || 0) * 100);
  const hasLostImage = !!lost_report?.image_path;
  const hasFoundImage = !!found_report?.image_path;

  const handleProofImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveProofImage = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!proofDescription.trim()) {
      setError('Please provide detailed ownership proof (e.g., distinguishing marks, wallpaper, stickers, or serial number).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let uploadedImagePath = null;
      if (proofFile) {
        const uploadRes = await reportService.uploadImage(proofFile);
        uploadedImagePath = uploadRes.image_url;
      }

      await matchService.submitClaim(match.id, {
        proof_description: proofDescription.trim(),
        proof_image_path: uploadedImagePath,
        student_phone: studentPhone.trim() || null,
      });

      setClaimed(true);
      if (onClaimSuccess) onClaimSuccess(match.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit verification request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>AI Match Details</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Lost #{lost_report?.report_number} vs Found #{found_report?.report_number}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Score Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', backgroundColor: '#0f172a', borderRadius: 'var(--radius-md)', color: '#fff', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>{scorePercent}%</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{scorePercent >= 80 ? 'High Confidence' : 'Moderate Match'}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Text + Image + Context analysis</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              {[
                { label: 'Text', value: match.text_score, color: '#38bdf8' },
                { label: 'Image', value: match.image_score, color: '#4ade80' },
                { label: 'Context', value: match.metadata_score, color: '#f472b6' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8' }}>{s.label}</div>
                  <div style={{ fontWeight: 700, color: s.color }}>{Math.round((s.value || 0) * 100)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Side by Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Lost Item */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span className="badge badge-rose" style={{ marginBottom: '0.75rem' }}>Your Lost Item</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--primary)' }}>{lost_report?.item_name}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Tag size={13} /> {lost_report?.category}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={13} /> {lost_report?.location || 'Unknown'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={13} /> {lost_report?.date_lost || 'Recent'}</div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4, marginBottom: '0.75rem' }}>{lost_report?.description}</p>
              {hasLostImage && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ImageIcon size={12} /> Your reported photo</div>
                  <img src={lost_report.image_path} alt="Lost item" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              )}
            </div>

            {/* Found Item */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span className="badge badge-emerald" style={{ marginBottom: '0.75rem' }}>Found at Security Desk</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--primary)' }}>{found_report?.item_name}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Tag size={13} /> {found_report?.category}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={13} /> {found_report?.location_found}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={13} /> {found_report?.date_found || 'Recent'}</div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4, marginBottom: '0.75rem' }}>{found_report?.description}</p>
              {hasFoundImage && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ImageIcon size={12} /> Photo of found item</div>
                  <img src={found_report.image_path} alt="Found item" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                </div>
              )}
              {!hasFoundImage && !hasLostImage && (
                <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  No images available. Match is based on semantic text description analysis.
                </div>
              )}
            </div>
          </div>

          {/* AI Explanation */}
          <div style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-text)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              <Sparkles size={16} /> AI Match Rationale
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-text)', lineHeight: 1.5 }}>
              {match.explanation || 'Semantic vector search identified high overlap in item description and contextual proximity.'}
            </p>
          </div>

          {/* Claim Section (Students only) */}
          {userRole === 'student' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              {claimed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: 'var(--emerald-subtle)', color: 'var(--emerald-text)', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <div>Verification request submitted!</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: '0.2rem' }}>Visit the Campus Security Desk with your college ID card to complete the physical handover verification.</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleClaim}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                      <ShieldCheck size={18} color="var(--accent)" />
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Claim Verification & Ownership Proof</h4>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      To prevent false claims, provide details only the legitimate owner would know. Campus Security will verify this during in-person collection.
                    </p>

                    {error && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.8rem', backgroundColor: 'var(--rose-subtle)', color: 'var(--rose-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        <AlertCircle size={15} /> {error}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={13} /> Contact Phone Number</span>
                        </label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="e.g. +91 98765 43210"
                          value={studentPhone}
                          onChange={(e) => setStudentPhone(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Upload size={13} /> Counter-Proof Photo (Optional)</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="form-input"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          onChange={handleProofImageChange}
                        />
                      </div>
                    </div>

                    {proofPreview && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                        <img src={proofPreview} alt="Proof preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                        <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Proof attachment ready (bill / box / invoice)
                        </div>
                        <button type="button" onClick={handleRemoveProofImage} style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Remove</button>
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FileText size={13} /> Distinctive Ownership Proof *</span>
                      </label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        required
                        placeholder="Mention distinctive details: lockscreen wallpaper, stickers, scratches, exact keychain, serial number, or item contents..."
                        value={proofDescription}
                        onChange={(e) => setProofDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button type="submit" disabled={submitting} className="btn btn-accent">
                      <CheckCircle2 size={16} />
                      {submitting ? 'Submitting Proof...' : 'Submit Ownership Proof & Claim'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
