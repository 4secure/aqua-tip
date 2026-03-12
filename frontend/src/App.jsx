import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import AppLayout from './components/layout/AppLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CtiSearchPage from './pages/CtiSearchPage';
import CtiReportPage from './pages/CtiReportPage';
import IocSearchPage from './pages/IocSearchPage';
import FeedsPage from './pages/FeedsPage';
import ThreatMapPage from './pages/ThreatMapPage';
import VulnScannerPage from './pages/VulnScannerPage';
import DomainReportPage from './pages/DomainReportPage';
import CveDetailPage from './pages/CveDetailPage';
import SettingsPage from './pages/SettingsPage';
import ComponentsPage from './pages/ComponentsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route index element={<LandingPage />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cti" element={<CtiSearchPage />} />
              <Route path="/cti-report" element={<CtiReportPage />} />
              <Route path="/ioc-search" element={<IocSearchPage />} />
              <Route path="/feeds" element={<FeedsPage />} />
              <Route path="/threat-map" element={<ThreatMapPage />} />
              <Route path="/vuln-scanner" element={<VulnScannerPage />} />
              <Route path="/domain-report" element={<DomainReportPage />} />
              <Route path="/cve-detail" element={<CveDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/components" element={<ComponentsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
