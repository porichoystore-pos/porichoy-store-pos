import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  const location = useLocation();
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

  return (
    <>
      {/* Overlay for mobile when sidebar is fully open */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
                  onClick={() => {
                    // On mobile, close sidebar after navigation if it's open
                    if (isMobile && sidebarOpen) {
                      setSidebarOpen(false);
                    }
                  }}
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
    </>
  );
};

export default Sidebar;