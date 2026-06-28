import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './layout/Topbar';
import MobileTabBar from './layout/MobileTabBar';
import NavDrawer from './layout/NavDrawer';
import { allNavItems } from '../constants/navigation';

function useBreadcrumb() {
  const location = useLocation();
  const match = allNavItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  );
  if (!match) return null;
  return match.name;
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed] = useState(false);
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const breadcrumb = useBreadcrumb();

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Topbar
          breadcrumb={breadcrumb}
          showMenuButton
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden pb-[var(--shell-tabbar-height)] md:pb-0">
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.2, 0, 0, 1] }}
            className="p-4 md:p-6 max-w-[1600px] mx-auto w-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <MobileTabBar onMoreClick={() => setDrawerOpen(true)} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
