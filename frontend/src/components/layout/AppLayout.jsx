import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import TrialBanner from './TrialBanner';
import ParticleBackground from '../ui/ParticleBackground';
import LoadingScreen from '../ui/LoadingScreen';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function AppLayout() {
  const { collapsed, toggle } = useSidebarCollapse();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading } = useAuth();

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <LoadingScreen />
          </motion.div>
        )}
      </AnimatePresence>
      {!loading && (
        <>
          <ParticleBackground />
          <Sidebar
            collapsed={collapsed}
            toggle={toggle}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
          <Topbar
            collapsed={collapsed}
            onHamburgerClick={() => setMobileOpen(true)}
          />
          <TrialBanner />
          <main className={`flex-1 pt-[40px] p-6 transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-[260px]'} ml-0`}>
            <Outlet />
          </main>
        </>
      )}
    </>
  );
}
