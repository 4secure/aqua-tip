import { useLocation, Link } from 'react-router-dom';
import { NOTIFICATIONS } from '../../data/mock-data';
import { Icon } from '../../data/icons';
import { useAuth } from '../../contexts/AuthContext';
import { GradientButton } from '../ui/GradientButton';

const PAGE_NAMES = {
  '/dashboard': 'Dashboard',
  '/cti': 'IP Lookup',
  '/cti-report': 'IP Lookup',
  '/ioc-search': 'IOC Search',
  '/feeds': 'Threat Feeds',
  '/threat-map': 'Threat Map',
  '/vuln-scanner': 'Vuln Scanner',
  '/domain-report': 'Domain Intel',
  '/cve-detail': 'CVE Explorer',
  '/settings': 'Settings',
  '/components': 'Components',
};

export default function Topbar({ onSearchClick, onNotifClick }) {
  const location = useLocation();
  const { isAuthenticated, userInitials } = useAuth();
  const pageName = PAGE_NAMES[location.pathname] || 'Dashboard';
  const unreadCount = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <header id="topbar" className="fixed top-0 left-[260px] right-0 h-[60px] bg-surface/80 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">AquaSecure</span>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium">{pageName}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-sm text-text-muted hover:border-violet/30 hover:text-text-secondary transition-all"
          onClick={onSearchClick}
        >
          <Icon name="search" />
          <span>Search...</span>
          <kbd className="ml-4 px-1.5 py-0.5 bg-surface-3 rounded text-[10px] font-mono border border-border">⌘K</kbd>
        </button>

        {isAuthenticated ? (
          <>
            {/* Plan badge */}
            <div className="premium-badge">
              <Icon name="zap" />
              PRO
            </div>

            {/* Notifications */}
            <button
              className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface-2"
              onClick={onNotifClick}
            >
              <Icon name="bell" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet to-cyan flex items-center justify-center text-xs font-bold text-white cursor-pointer">{userInitials}</div>
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
