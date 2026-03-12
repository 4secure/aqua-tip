import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from '../../data/mock-data';
import { Icon, ICONS } from '../../data/icons';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { user, userInitials, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
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

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-xs font-bold text-white">{userInitials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">{user?.name}</div>
            <div className="text-xs text-text-muted truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="text-text-muted hover:text-red transition-colors" title="Log out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
