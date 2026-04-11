import { Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';

export default function ProtectedRoute() {
  const { isAuthenticated, emailVerified, onboardingCompleted, loading } = useAuth();

  if (loading) {
    return (
      <AnimatePresence>
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <LoadingScreen />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!onboardingCompleted) {
    return <Navigate to="/get-started" replace />;
  }

  return <Outlet />;
}
