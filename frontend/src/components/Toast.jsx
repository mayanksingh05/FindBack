import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X, Bell, ArrowRight } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <aside 
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '380px',
        width: 'calc(100% - 2.5rem)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        let borderAccent = 'var(--blue)';
        let IconComponent = Bell;
        let iconColor = 'var(--blue)';

        if (t.type === 'MATCH_FOUND') {
          borderAccent = 'var(--accent)';
          IconComponent = Sparkles;
          iconColor = 'var(--accent)';
        } else if (t.type === 'CLAIM_RESULT') {
          if (t.title?.toLowerCase().includes('verified') || t.message?.toLowerCase().includes('verified')) {
            borderAccent = 'var(--emerald)';
            IconComponent = CheckCircle2;
            iconColor = 'var(--emerald)';
          } else {
            borderAccent = 'var(--rose)';
            IconComponent = AlertCircle;
            iconColor = 'var(--rose)';
          }
        }

        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border)',
              borderLeft: `5px solid ${borderAccent}`,
              padding: '0.9rem 1rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ marginTop: '0.1rem', flexShrink: 0 }}>
              <IconComponent size={20} color={iconColor} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {t.title}
                </h4>
                <button
                  onClick={() => onDismiss(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.15rem',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                  title="Dismiss alert"
                >
                  <X size={15} />
                </button>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {t.message}
              </p>

              {t.action && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={() => {
                      t.action.onClick();
                      onDismiss(t.id);
                    }}
                    className="btn btn-sm btn-outline"
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    {t.action.label} <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
