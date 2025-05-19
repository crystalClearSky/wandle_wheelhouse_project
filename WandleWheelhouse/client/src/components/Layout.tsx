import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";
import DonationModal from "../modals/DonationModal";
import LoginModal from "../modals/LoginModal";
import RegisterModal from "../modals/RegisterModal";
import ForgotPasswordModal from "../modals/ForgotPasswordModal";
import { useAuth } from "../contexts/AuthContext";
import ConsentBanner from './ui/ConsentBanner';
import BlogService from "../services/BlogService";

const Layout: React.FC = () => {
  const {
    isDonationModalOpen,
    closeDonationModal,
    activeAuthModal,
    openAuthModal,
    closeAuthModal,
    loginEmail,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const switchToRegister = () => {
    openAuthModal('register');
  };

  const switchToLogin = () => {
    openAuthModal('login');
  };

  const isShiftedRoute = [
    "/profile",
    "/dashboard",
    "/contact",
    "/reset-password",
  ].includes(location.pathname) || location.pathname.startsWith('/blog/');

  const { pathname } = useLocation();
  const [hasBlogArticles, setHasBlogArticles] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname === "/blog") {
      const checkArticles = async () => {
        try {
          const result = await BlogService.hasArticles();
          setHasBlogArticles(result);
        } catch (err) {
          console.error("Failed to check blog articles:", err);
          setHasBlogArticles(false);
        }
      };
      checkArticles();
    } else {
      setHasBlogArticles(null);
    }
  }, [pathname]);

  // Trigger LoginModal based on navigation state
  useEffect(() => {
    if (location.pathname === '/' && location.state?.openLoginModal) {
      openAuthModal('login');
      // Clear state to prevent re-triggering on refresh
      navigate('/', { replace: true, state: {} });
    }
  }, [location, openAuthModal, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <Navbar hasBlogArticles={hasBlogArticles} />
      <main className="flex-grow">
        <div
          className={`pt-0 sm:pt-0 md:pt-0 lg:pt-0 ${
            isShiftedRoute ? "mt-[calc(var(--navbar-height,0px)+1rem)] sm:mt-[calc(var(--navbar-height,0px)+1.5rem)]" : ""
          }`}
          style={{ '--navbar-height': '4rem' } as React.CSSProperties}
        >
          <Outlet />
        </div>
      </main>
      <Footer />

      <LoginModal
        isOpen={activeAuthModal === 'login'}
        onRequestClose={closeAuthModal}
        onSwitchToRegister={switchToRegister}
        initialEmail={loginEmail}
      />
      <RegisterModal
        isOpen={activeAuthModal === 'register'}
        onRequestClose={closeAuthModal}
        onSwitchToLogin={switchToLogin}
      />
      <ForgotPasswordModal
        isOpen={activeAuthModal === 'forgotPassword'}
        onRequestClose={closeAuthModal}
        onSwitchToLogin={switchToLogin}
      />
      <DonationModal
        isOpen={isDonationModalOpen}
        onRequestClose={closeDonationModal}
      />
      <ConsentBanner />
    </div>
  );
};

export default Layout;