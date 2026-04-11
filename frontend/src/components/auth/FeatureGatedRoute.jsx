import { Outlet, useLocation } from 'react-router-dom';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import UpgradeCTA from '../ui/UpgradeCTA';

export default function FeatureGatedRoute() {
  const location = useLocation();
  const { hasAccess } = useFeatureAccess();

  if (!hasAccess(location.pathname)) {
    return <UpgradeCTA />;
  }

  return <Outlet />;
}
