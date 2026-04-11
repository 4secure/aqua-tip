import { useAuth } from '../contexts/AuthContext';

const FREE_ACCESSIBLE_PATHS = ['/threat-search', '/settings'];

export function useFeatureAccess() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return { hasAccess: () => true, isFreePlan: false, isTrialActive: false };
  }

  const planSlug = user.plan?.slug;
  const isTrialActive = user.trial_active === true;
  const isFreePlan = planSlug === 'free' && !isTrialActive;

  const hasAccess = (path) => !isFreePlan || FREE_ACCESSIBLE_PATHS.includes(path);

  return { hasAccess, isFreePlan, isTrialActive };
}
