import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TrialBanner() {
  const { user, isAuthenticated } = useAuth();

  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('trial-banner-dismissed') === 'true'
  );

  const isTrialActive = user?.trial_active === true;
  const isTrialExpired = !user?.plan && !user?.trial_active && user?.trial_days_left === 0;
  const daysLeft = user?.trial_days_left ?? 0;

  const showBanner = isAuthenticated && !user?.plan && (isTrialActive || isTrialExpired);

  if (!showBanner) return null;
  if (dismissed && !isTrialExpired) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('trial-banner-dismissed', 'true');
    setDismissed(true);
  };

  let bannerClass;
  let IconComponent;
  let message;

  if (isTrialExpired) {
    bannerClass = 'bg-red/20 border-b border-red/40 text-red';
    IconComponent = AlertTriangle;
    message = (
      <>
        Your trial has ended{' '}
        <Link to="/pricing" className="font-semibold underline">
          Upgrade Now
        </Link>
      </>
    );
  } else if (daysLeft >= 1 && daysLeft <= 7) {
    bannerClass = 'bg-amber/20 border-b border-amber/40 text-amber';
    IconComponent = AlertTriangle;
    message = (
      <>
        Only {daysLeft} day{daysLeft !== 1 ? 's' : ''} left!{' '}
        <Link to="/pricing" className="font-semibold underline">
          View Plans
        </Link>
      </>
    );
  } else {
    bannerClass = 'bg-amber/10 border-b border-amber/20 text-amber';
    IconComponent = Clock;
    message = (
      <>
        {daysLeft} days left on your trial{' '}
        <Link to="/pricing" className="underline font-semibold">
          View Plans
        </Link>
      </>
    );
  }

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-sm font-mono ${bannerClass}`}>
      <div className="flex items-center gap-2">
        <IconComponent className="w-4 h-4 shrink-0" />
        <span>{message}</span>
      </div>
      {!isTrialExpired && (
        <button
          onClick={handleDismiss}
          className="p-1 hover:opacity-70 transition-opacity shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
