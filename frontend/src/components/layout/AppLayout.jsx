import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationDrawer from './NotificationDrawer';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export default function AppLayout() {
  const { collapsed, toggle } = useSidebarCollapse();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const toggleNotif = useCallback(() => setNotifOpen(v => !v), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  useKeyboardShortcut('Escape', () => {
    setNotifOpen(false);
  });

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        toggle={toggle}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <Topbar
        collapsed={collapsed}
        onHamburgerClick={() => setMobileOpen(true)}
        onNotifClick={toggleNotif}
      />
      <main className={`flex-1 pt-[84px] p-6 transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-[260px]'} ml-0`}>
        <Outlet />
      </main>
      <NotificationDrawer open={notifOpen} onClose={closeNotif} />
    </>
  );
}
