import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GradientButton } from '../ui/GradientButton';

const PAGE_NAMES = {
  '/dashboard': 'Dashboard',
  '/ip-search': 'IP Search',
  '/threat-map': 'Threat Map',
  '/dark-web': 'Dark Web',
  '/threat-actors': 'Threat Actors',
  '/threat-news': 'Threat News',
  '/settings': 'Settings',
};

export default function Topbar({ collapsed, onHamburgerClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, userInitials, logout } = useAuth();
  const pageName = PAGE_NAMES[location.pathname] || 'Dashboard';

  const [avatarDropdown, setAvatarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAvatarDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setAvatarDropdown(false);
    await logout();
    navigate('/');
  }

  function handleManageProfile() {
    setAvatarDropdown(false);
    navigate('/settings');
  }

  return (
    <header
      id="topbar"
      className={`fixed top-0 right-0 h-[60px] bg-surface/80 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-6 transition-all duration-300 ${
        collapsed ? 'lg:left-16' : 'lg:left-[260px]'
      } left-0`}
    >
      {/* Left side: hamburger + breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          className="lg:hidden p-2 -ml-2 mr-2 text-text-muted hover:text-text-primary"
          onClick={onHamburgerClick}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-text-muted">Aqua-Tip</span>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium">{pageName}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            {/* Plan chip */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet/10 text-violet-light border border-violet/20">
              {user?.plan?.name || (user?.trial_active ? 'Trial' : 'Free')}
            </span>

            {/* Upgrade button (hidden for Enterprise) */}
            {user?.plan?.name !== 'Enterprise' && (
              <Link to="/pricing">
                <GradientButton size="sm">Upgrade</GradientButton>
              </Link>
            )}

            {/* Avatar with dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAvatarDropdown(v => !v)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-xs font-bold text-white cursor-pointer overflow-hidden"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </button>

              {avatarDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-2 border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={handleManageProfile}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <span className="font-mono">Manage Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-red transition-colors"
                  >
                    <span className="font-mono">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost font-display text-sm">Log In</Link>
            <Link to="/register">
              <GradientButton size="sm">Sign Up</GradientButton>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
