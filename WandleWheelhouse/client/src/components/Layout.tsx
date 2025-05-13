import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  // Apply shift for routes where navbar is fixed (ignoring isScrolled)
  const isShiftedRoute = ["/profile", "/dashboard", "/contact"].includes(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar with fixed positioning */}
      <Navbar />

      {/* Main content area */}
      <main className="grow pt-0 md:pt-0">
        <div className={`pt-20 sm:pt-24 md:pt-0 lg:pt-0 ${isShiftedRoute ? 'mt-[10vh]' : ''}`}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Layout;