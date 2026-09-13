import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';
import Toast from './Toast';
import { 
  Compass, 
  Bell, 
  PlusCircle, 
  LogOut, 
  Shield, 
  GraduationCap, 
  CheckCheck,
  Search,
  Check,
  Sparkles,
  FileCheck,
  ExternalLink
} from 'lucide-react';

export default function Navbar({ onOpenReport }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [toasts, setToasts] = useState([]);
  const knownNotifIds = useRef(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setToasts([]);
      knownNotifIds.current.clear();
      isInitialLoad.current = true;
      return;
    }

    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications(false);
    }, 12000);

    return () => clearInterval(interval);
  }, [user]);

  const loadNotifications = async (initial = isInitialLoad.current) => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);

      if (initial) {
        data.forEach((n) => knownNotifIds.current.add(n.id));
        isInitialLoad.current = false;
      } else {
        // Detect newly arrived notifications
        const incomingNew = data.filter((n) => !knownNotifIds.current.has(n.id) && !n.is_read);
        if (incomingNew.length > 0) {
          incomingNew.forEach((n) => {
            knownNotifIds.current.add(n.id);
            const newToast = {
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              action: n.type === 'MATCH_FOUND' ? {
                label: 'View AI Match',
                onClick: () => navigate('/student/dashboard'),
              } : (n.type === 'CLAIM_RESULT' ? {
                label: 'View Handover Status',
                onClick: () => navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'),
              } : null),
            };

            setToasts((prev) => [newToast, ...prev.slice(0, 2)]);

            // Auto dismiss toast after 6 seconds
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== n.id));
            }, 6000);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const handleMarkOneRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '68px'
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Compass size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                FindBack
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Campus AI</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              College Lost & Found System
            </div>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {user && (
            <>
              {user.role === 'student' ? (
                <Link to="/student/dashboard" style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <GraduationCap size={18} color="var(--blue)" />
                  My Dashboard
                </Link>
              ) : (
                <Link to="/admin/dashboard" style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <Shield size={18} color="var(--accent)" />
                  Admin Console
                </Link>
              )}

              <Link to="/browse" style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Search size={16} />
                Found Catalog
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              {/* Report Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => onOpenReport('lost')}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <PlusCircle size={15} />
                  Report Lost
                </button>
                <button 
                  onClick={() => onOpenReport('found')}
                  className="btn btn-outline btn-sm"
                >
                  <PlusCircle size={15} />
                  Report Found
                </button>
              </div>

              {/* Notifications Popover */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifs(!showNotifs)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    color: 'var(--text-main)'
                  }}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--rose)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '115%',
                    width: '360px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border)',
                    padding: '1rem',
                    zIndex: 200
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Notifications</h4>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.75rem',
                            color: 'var(--blue)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Check size={14} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n) => {
                          const isMatch = n.type === 'MATCH_FOUND' || n.reference_type === 'match';
                          const isClaim = n.type === 'CLAIM_RESULT' || n.reference_type === 'claim';

                          return (
                            <div
                              key={n.id}
                              style={{
                                padding: '0.75rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: n.is_read ? 'transparent' : 'var(--blue-subtle)',
                                marginBottom: '0.45rem',
                                borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--blue)',
                                borderBottom: '1px solid var(--border-subtle)',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {isMatch ? (
                                    <Sparkles size={14} color="var(--accent)" />
                                  ) : isClaim ? (
                                    <FileCheck size={14} color="var(--emerald)" />
                                  ) : (
                                    <Bell size={14} color="var(--blue)" />
                                  )}
                                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    {n.title}
                                  </span>
                                </div>
                                {!n.is_read && (
                                  <button
                                    onClick={(e) => handleMarkOneRead(e, n.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--text-muted)',
                                      padding: '0.1rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                    title="Mark as read"
                                  >
                                    <Check size={13} />
                                  </button>
                                )}
                              </div>

                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                                {n.message}
                              </div>

                              {/* Interactive Deep-Link Actions */}
                              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem' }}>
                                {isMatch && (
                                  <button
                                    onClick={() => {
                                      setShowNotifs(false);
                                      navigate('/student/dashboard');
                                    }}
                                    className="btn btn-sm btn-outline"
                                    style={{
                                      padding: '0.2rem 0.5rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      borderColor: 'var(--accent)',
                                      color: 'var(--accent-text)',
                                      backgroundColor: 'var(--accent-subtle)',
                                    }}
                                  >
                                    <Sparkles size={11} /> View AI Match
                                  </button>
                                )}

                                {isClaim && (
                                  <button
                                    onClick={() => {
                                      setShowNotifs(false);
                                      navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
                                    }}
                                    className="btn btn-sm btn-outline"
                                    style={{
                                      padding: '0.2rem 0.5rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      borderColor: 'var(--emerald)',
                                      color: 'var(--emerald-text)',
                                      backgroundColor: 'var(--emerald-subtle)',
                                    }}
                                  >
                                    <FileCheck size={11} /> View Handover Status
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#f1f5f9',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: user.role === 'admin' ? 'var(--accent)' : 'var(--blue)',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
                    {user.name.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {user.college_id}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="btn btn-outline btn-sm"
                style={{ padding: '0.5rem' }}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Floating Real-Time Toast Alerts */}
      <Toast
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </header>
  );
}
