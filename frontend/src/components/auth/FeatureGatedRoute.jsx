import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';

export default function FeatureGatedRoute() {
  const location = useLocation();
  const { hasAccess } = useFeatureAccess();

  if (!hasAccess(location.pathname)) {
    return <Navigate to="/threat-search" replace />;
  }

  return <Outlet />;
}
