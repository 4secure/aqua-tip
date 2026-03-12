import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SearchModal from './SearchModal';
import NotificationDrawer from './NotificationDrawer';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

export default function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const toggleNotif = useCallback(() => setNotifOpen(v => !v), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  useKeyboardShortcut('k', () => setSearchOpen(v => !v), { meta: true });
  useKeyboardShortcut('Escape', () => {
    setSearchOpen(false);
    setNotifOpen(false);
  });

  return (
    <>
      <Sidebar />
      <Topbar onSearchClick={openSearch} onNotifClick={toggleNotif} />
      <main className="main-content">
        <Outlet />
      </main>
      <SearchModal open={searchOpen} onClose={closeSearch} />
      <NotificationDrawer open={notifOpen} onClose={closeNotif} />
    </>
  );
}
