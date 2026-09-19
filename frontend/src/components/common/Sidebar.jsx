import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiFileText,
  FiUsers,
  FiPieChart,
  FiGrid,
  FiSettings
} from 'react-icons/fi';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/pos', icon: FiShoppingCart, label: 'POS' },
    { path: '/products', icon: FiPackage, label: 'Products' },
    { path: '/categories', icon: FiGrid, label: 'Categories' },
    { path: '/bills', icon: FiFileText, label: 'Bills' },
    { path: '/customers', icon: FiUsers, label: 'Customers' },
    { path: '/reports', icon: FiPieChart, label: 'Reports' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  // ============================================
  // 📱 MOBILE VIEW: Horizontal Bottom Navigation
  // ============================================
  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-2xl">
        <div className="flex items-center justify-around h-16">
          {menuItems.map((item) => (
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
                  <span className="text-[9px] font-medium">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  // ============================================
  // 🖥️ DESKTOP/TABLET VIEW: Left Vertical Sidebar
  // ============================================
  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white shadow-lg transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <nav className="p-3 h-full overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center p-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                title={!sidebarOpen ? item.label : ''}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
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