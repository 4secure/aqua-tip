import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { NAV_ITEMS } from '../../data/mock-data';
import { Icon } from '../../data/icons';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { user, userInitials, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  }

  function handleSettingsClick() {
    setDropdownOpen(false);
    navigate('/settings');
  }

  return (
    <aside id="sidebar" className="fixed left-0 top-0 w-[260px] h-screen bg-surface border-r border-border z-40 flex flex-col">
      {/* Logo */}
      <div className="h-[60px] flex items-center gap-3 px-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet to-cyan flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          </svg>
        </div>
        <div>
          <div className="font-display font-bold text-base text-text-primary tracking-tight">AquaSecure</div>
          <div className="text-[10px] text-text-muted tracking-wider uppercase">Threat Intel Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_ITEMS.map(group => (
          <div key={group.group} className="mb-6">
            <div className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-muted">{group.group}</div>
            <div className="space-y-0.5">
              {group.items.map(item => (
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
                      <span className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-violet-light' : ''}`}>
                        <Icon name={item.icon} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          item.badge === 'LIVE'
                            ? 'bg-green/10 text-green border border-green/20'
                            : 'bg-surface-3 text-text-muted'
                        }`}>{item.badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with avatar dropdown */}
      <div className="p-4 border-t border-border relative" ref={dropdownRef}>
        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-surface-2 border border-border rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="font-mono">Account Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-red transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-mono">Logout</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="w-full flex items-center gap-3 rounded-lg hover:bg-surface-2 transition-colors p-1 -m-1"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-xs font-bold text-white">
              {userInitials}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium text-text-primary truncate">{user?.name}</div>
            <div className="text-xs text-text-muted truncate">{user?.email}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
