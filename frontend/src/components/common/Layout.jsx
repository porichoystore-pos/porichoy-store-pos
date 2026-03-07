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
      // On mobile, default to icons only (sidebar closed)
      if (mobile) {
        setSidebarOpen(false);
      } else {
        // On desktop, default to full sidebar
        setSidebarOpen(true);
      }
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
          className={`flex-1 p-4 sm:p-6 transition-all duration-300 mt-16 ${
            sidebarOpen ? 'md:ml-64 ml-20' : 'ml-20'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;