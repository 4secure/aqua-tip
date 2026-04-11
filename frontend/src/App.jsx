import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import FeatureGatedRoute from './components/auth/FeatureGatedRoute';
import GuestRoute from './components/auth/GuestRoute';
import AppLayout from './components/layout/AppLayout';
import LoadingScreen from './components/ui/LoadingScreen';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ThreatSearchPage from './pages/ThreatSearchPage';
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
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ContactUsPage = lazy(() => import('./pages/ContactUsPage'));

function LazyFallback() {
  return <LoadingScreen />;
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
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/pricing" element={<PricingPage />} />

            {/* All app routes with shared layout */}
            <Route element={<AppLayout />}>
              {/* Public route -- accessible without auth */}
              <Route path="/threat-search" element={<ThreatSearchPage />} />
              <Route path="/ip-search" element={<Navigate to="/threat-search" replace />} />

              {/* Protected routes -- auth + verified + onboarded */}
              <Route element={<ProtectedRoute />}>
                <Route path="/settings" element={<SettingsPage />} />

                {/* Feature-gated routes -- free plan sees UpgradeCTA */}
                <Route element={<FeatureGatedRoute />}>
                  <Route path="/dashboard" element={<ThreatMapPage />} />
                  <Route path="/threat-map" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dark-web" element={<DarkWebPage />} />
                  <Route path="/threat-actors" element={<ThreatActorsPage />} />
                  <Route path="/threat-news" element={<ThreatNewsPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
