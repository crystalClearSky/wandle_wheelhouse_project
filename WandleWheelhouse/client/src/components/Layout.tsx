import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';
import ProfilePage from '../pages/ProfilePage';

const Layout: React.FC = () => {
  const location = useLocation();
  const isProfilePage = location.pathname === '/profile';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      {/* Main content area */}
      <main className="grow py-0">
        {isProfilePage ? (
          <div className="pt-[54px] max-w-[20px]:pt-[20px] sm:pt-[40px] md:pt-[50px] lg:pt-[50px]">
            <ProfilePage />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Layout;