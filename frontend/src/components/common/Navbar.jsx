import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSearch } from 'react-icons/fi';
import GlobalSearch from './GlobalSearch';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="px-3 sm:px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-icon"
              aria-label="Toggle sidebar"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <Link to="/dashboard" className="min-w-0">
              <span className="text-lg sm:text-xl font-bold text-primary-600 truncate">Porichoy Store</span>
            </Link>

            {/* Global search (desktop) */}
            <div className="hidden md:block flex-1 max-w-md ml-4 lg:ml-8">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Mobile search toggle */}
            {isMobile && (
              <button
                className="btn-icon"
                aria-label="Search"
                onClick={() => setShowMobileSearch(true)}
              >
                <FiSearch className="w-5 h-5" />
              </button>
            )}
            <button className="btn-icon relative" aria-label="Notifications">
              <FiBell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Account menu"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-primary-600" />
                </div>
                {!isMobile && (
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user?.name || user?.username}
                  </span>
                )}
              </button>

              {showProfileMenu && (
                <>
                  {/* Click-away backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20 animate-fade-in">
                    <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiLogOut className="mr-2 w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {showMobileSearch && (
        <GlobalSearch
          isMobileSearchOpen
          onCloseMobile={() => setShowMobileSearch(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;