import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Desktop default open, mobile default closed
      setSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main
          className={`flex-1 transition-all duration-300 mt-16 ${
            isMobile
              ? 'p-3 pb-24 ml-0'           // 📱 Mobile: full width + bottom padding for nav bar
              : sidebarOpen
                ? 'ml-64 p-6'              // 🖥️ Desktop: sidebar open
                : 'ml-20 p-6'              // 🖥️ Desktop: sidebar collapsed
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;