import { useLocation, Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import { GradientButton } from './GradientButton';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_FEATURES = {
  '/dashboard': {
    name: 'Threat Map',
    description: 'Real-time threat map with live attack monitoring and geographic visualization.',
  },
  '/threat-actors': {
    name: 'Threat Actors',
    description: 'Browse intrusion sets with TTPs, tools, and targeted sectors.',
  },
  '/threat-news': {
    name: 'Threat News',
    description: 'Latest intelligence reports with category filtering and date browsing.',
  },
  '/dark-web': {
    name: 'Dark Web',
    description: 'Search for compromised credentials and data breaches.',
  },
};

const DEFAULT_FEATURE = {
  name: 'This Feature',
  description: 'This feature is available on paid plans.',
};

export default function UpgradeCTA() {
  const location = useLocation();
  const { user } = useAuth();

  const feature = PAGE_FEATURES[location.pathname] || DEFAULT_FEATURE;
  const canStartTrial = user?.trial_days_left > 0 && !user?.plan;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-10 max-w-lg text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-violet/10 border border-violet/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-violet" />
          </div>
        </div>

        <h2 className="text-2xl font-sans font-bold text-text-primary mb-3">
          Unlock {feature.name}
        </h2>

        <p className="text-text-secondary mb-8 leading-relaxed">
          {feature.description}
        </p>

        <Link to="/pricing">
          <GradientButton size="md">
            <Zap className="w-4 h-4" />
            Upgrade Plan
          </GradientButton>
        </Link>

        {canStartTrial && (
          <p className="mt-4 text-sm text-text-muted">
            Or{' '}
            <Link
              to="/pricing"
              className="text-violet hover:text-violet-light underline transition-colors"
            >
              start your free trial
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
