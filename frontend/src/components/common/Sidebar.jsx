import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiX } from 'react-icons/fi';
import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiFileText,
  FiUsers,
  FiPieChart,
  FiGrid,
  FiEdit3,
  FiSettings
} from 'react-icons/fi';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer when route changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // All menu items
  const allMenuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/pos', icon: FiShoppingCart, label: 'POS' },
    { path: '/products', icon: FiPackage, label: 'Products' },
    { path: '/categories', icon: FiGrid, label: 'Categories' },
    { path: '/bills', icon: FiFileText, label: 'Bills' },
    { path: '/customers', icon: FiUsers, label: 'Customers' },
    ...(user?.role === 'admin'
      ? [
          { path: '/sales/manual', icon: FiEdit3, label: 'Manual Sale' },
          { path: '/reports', icon: FiPieChart, label: 'Reports' },
        ]
      : []),
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  // Bottom nav items (mobile only - 5 key items)
  const bottomNavPaths = ['/dashboard', '/pos', '/products'];
  if (user?.role === 'admin') {
    bottomNavPaths.push('/sales/manual', '/reports');
  } else {
    // For staff, show Bills and Customers instead
    bottomNavPaths.push('/bills', '/customers');
  }
  const bottomNavItems = allMenuItems.filter(item => bottomNavPaths.includes(item.path));

  // ============================================
  // 📱 MOBILE VIEW
  // ============================================
  if (isMobile) {
    return (
      <>
        {/* ===== Mobile Slide-in Drawer (hamburger menu) ===== */}
        {sidebarOpen && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Drawer */}
            <aside
              className="fixed left-0 top-0 h-full w-72 bg-white z-[60] shadow-2xl flex flex-col animate-slide-in-left"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-lg font-bold text-primary-600">Porichoy Store</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <FiX className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Drawer Menu Items */}
              <nav className="flex-1 overflow-y-auto p-3">
                <ul className="space-y-1">
                  {allMenuItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-primary-50 text-primary-600 font-semibold'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                          }`
                        }
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  © 2026 Porichoy Store
                </p>
              </div>
            </aside>
          </>
        )}

        {/* ===== Mobile Bottom Navigation (always visible - 5 key items) ===== */}
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-16">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-b-full" />
                    )}
                    <item.icon className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-medium leading-none">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </>
    );
  }

  // ============================================
  // 🖥️ DESKTOP/TABLET VIEW: Left Vertical Sidebar
  // ============================================
  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <nav className="p-3 h-full overflow-y-auto">
        <ul className="space-y-1">
          {allMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    sidebarOpen ? '' : 'justify-center'
                  } ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                  }`
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm truncate">{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;