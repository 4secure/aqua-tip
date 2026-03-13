import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import IpSearchPage from './pages/IocSearchPage';
import ThreatMapPage from './pages/ThreatMapPage';
import SettingsPage from './pages/SettingsPage';

const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const GetStartedPage = lazy(() => import('./pages/GetStartedPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const EulaPage = lazy(() => import('./pages/EulaPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const DarkWebPage = lazy(() => import('./pages/DarkWebPage'));
const ThreatActorsPage = lazy(() => import('./pages/ThreatActorsPage'));
const ThreatNewsPage = lazy(() => import('./pages/ThreatNewsPage'));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route index element={<LandingPage />} />

            {/* Guest-only routes (no AppLayout) */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Auth required but NOT verified/onboarded -- standalone */}
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/get-started" element={<GetStartedPage />} />

            {/* Public placeholder pages */}
            <Route path="/eula" element={<EulaPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

            {/* All app routes with shared layout */}
            <Route element={<AppLayout />}>
              {/* Public route -- accessible without auth */}
              <Route path="/ip-search" element={<IpSearchPage />} />

              {/* Protected routes -- auth + verified + onboarded */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/threat-map" element={<ThreatMapPage />} />
                <Route path="/dark-web" element={<DarkWebPage />} />
                <Route path="/threat-actors" element={<ThreatActorsPage />} />
                <Route path="/threat-news" element={<ThreatNewsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
