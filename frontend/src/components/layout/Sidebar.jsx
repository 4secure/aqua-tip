import { useState, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Lock, Settings, LogOut, ChevronDown, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { NAV_CATEGORIES } from '../../data/mock-data';
import { Icon } from '../../data/icons';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ collapsed, toggle, mobileOpen, setMobileOpen }) {
  const [hovered, setHovered] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isAuthenticated, user, userInitials, logout } = useAuth();
  const navigate = useNavigate();
  const hoverTimerRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    hoverTimerRef.current = setTimeout(() => setHovered(true), 150);
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHovered(false);
  }, []);

  const showLabels = !collapsed || hovered;

  const sidebarWidth = collapsed && !hovered ? 'w-16' : 'w-[260px]';

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          fixed left-0 top-0 h-screen z-40 flex flex-col
          ${sidebarWidth}
          ${hovered && collapsed ? 'shadow-2xl z-50' : ''}
          transition-all duration-300 ease-in-out
          max-lg:fixed max-lg:z-50
          ${mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}
          lg:translate-x-0
        `}
        style={{
          background: 'rgba(15, 17, 23, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(30, 32, 48, 0.8)',
        }}
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            className="absolute top-4 right-4 p-1 text-text-muted hover:text-text-primary lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Logo */}
        <Link to="/" className="h-[60px] flex items-center gap-3 px-5 border-b border-border/50 shrink-0 hover:bg-surface-2 transition-colors">
          <img
            src="/logo.png"
            alt="Aqua-TIP"
            className="w-8 h-8 rounded-lg object-contain shrink-0"
          />
          {showLabels && (
            <div className="min-w-0">
              <div className="font-sans font-bold text-base text-text-primary tracking-tight">Aqua-Tip</div>
              <div className="text-[10px] text-text-muted tracking-wider uppercase">Threat Intel Platform</div>
            </div>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className={showLabels ? 'space-y-1' : 'space-y-0.5'}>
            {NAV_CATEGORIES.map(category => (
              <div key={category.label}>
                {/* Category header - only when labels visible */}
                {showLabels && (
                  <div className="px-4 py-1.5 mx-2 text-[10px] uppercase tracking-widest font-mono text-text-muted">
                    {category.label}
                  </div>
                )}

                {/* Category items */}
                <div className="space-y-0.5">
                  {category.items.map(item => {
                      const isAccessible = item.public || isAuthenticated;

                      if (!isAccessible) {
                        return (
                          <button
                            key={item.href}
                            onClick={() => navigate('/login', { state: { success: 'Log in to access all features' } })}
                            className="flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 transition-all duration-200 text-text-muted/50 opacity-40 hover:opacity-60 w-[calc(100%-16px)]"
                          >
                            <span className="w-5 h-5 flex items-center justify-center shrink-0">
                              <Icon name={item.icon} />
                            </span>
                            {showLabels && (
                              <>
                                <span className="flex-1 text-left">{item.label}</span>
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                              </>
                            )}
                          </button>
                        );
                      }

                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 transition-all duration-200 ${
                              isActive
                                ? 'bg-violet/10 text-violet-light border border-violet/20'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span className={`w-5 h-5 flex items-center justify-center shrink-0 ${isActive ? 'text-violet-light' : ''}`}>
                                <Icon name={item.icon} />
                              </span>
                              {showLabels && (
                                <span className="flex-1">{item.label}</span>
                              )}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Settings section - authenticated only */}
          {isAuthenticated && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className="flex items-center gap-3 px-4 py-2 text-sm rounded-lg mx-2 transition-all duration-200 text-text-secondary hover:text-text-primary hover:bg-surface-2 w-[calc(100%-16px)]"
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </span>
                {showLabels && (
                  <>
                    <span className="flex-1 text-left">Settings</span>
                    {settingsOpen
                      ? <ChevronDown className="w-4 h-4 shrink-0" />
                      : <ChevronRight className="w-4 h-4 shrink-0" />
                    }
                  </>
                )}
              </button>

              {settingsOpen && showLabels && (
                <>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `flex items-center gap-3 pl-12 pr-4 py-2 text-sm rounded-lg mx-2 transition-all duration-200 ${
                        isActive
                          ? 'bg-violet/10 text-violet-light border border-violet/20'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                      }`
                    }
                  >
                    Profile Management
                  </NavLink>
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="flex items-center gap-3 pl-12 pr-4 py-2 text-sm rounded-lg mx-2 transition-all duration-200 text-text-secondary hover:text-red hover:bg-surface-2 w-[calc(100%-16px)]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="p-3 border-t border-border/50 max-lg:hidden">
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted transition-colors"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>
    </>
  );
}
