import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import photoAsset from '../assets/photo_2025-05-06_14-16-42.jpg';
import { useAuth } from '../contexts/AuthContext';
import DonationModal from '../modals/DonationModal';
import LoginModal from '../modals/LoginModal';
import RegisterModal from '../modals/RegisterModal';
import Avatar from './ui/Avatar';
import Button from './ui/Button';

interface NavbarProps {
  hasBlogArticles: boolean | null;
}

const Navbar: React.FC<NavbarProps> = ({ hasBlogArticles }) => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const { pathname } = useLocation();

  // --- State ---
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoShrunk, setIsLogoShrunk] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // --- Check if navbar should have solid background ---
  const isFixedNavbarRoute = ["/profile", "/dashboard", "/contact", "/reset-password"].includes(pathname) ||
    (pathname === "/blog" && hasBlogArticles === false) || pathname.startsWith('/blog/');

  // --- Refs for closing menus ---
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // --- Handlers ---
  const openLoginModal = () => {
    setIsMobileMenuOpen(false);
    setIsLoginModalOpen(true);
  };
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const openRegisterModal = () => {
    setIsMobileMenuOpen(false);
    setIsRegisterModalOpen(true);
  };
  const closeRegisterModal = () => setIsRegisterModalOpen(false);
  const openDonateModal = () => setIsDonateModalOpen(true);
  const closeDonateModal = () => setIsDonateModalOpen(false);
  const handleLogout = () => {
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
    logout();
  };
  const switchToRegister = () => {
    closeLoginModal();
    openRegisterModal();
  };
  const switchToLogin = () => {
    closeRegisterModal();
    openLoginModal();
  };
  const toggleUserDropdown = () => setIsUserDropdownOpen((prev) => !prev);
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  // --- Smooth Scroll Handler for Home Link ---
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // --- Scroll Handler for Logo Scaling and Navbar Transparency ---
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const scrollThreshold = windowHeight * 0.2; // 20% of window height
      setIsLogoShrunk(pathname === "/" && scrollPosition > scrollThreshold);
      setIsScrolled(scrollPosition > scrollThreshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  // --- Click Outside Handler ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(target)
      ) {
        setIsUserDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isUserDropdownOpen || isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserDropdownOpen, isMobileMenuOpen]);

  return (
    <>
      {/* --- Logo (Top Left) --- */}
      {pathname !== "/dashboard" && (
        <div className="fixed top-6 left-6 z-30 animate-fade-in">
          <Link
            to="/"
            className={`opacity-95 flex items-center justify-center w-[100px] h-[120px] max-w-[450px]:w-[90px] max-w-[450px]:h-[90px] sm:w-[150px] sm:h-[180px] md:w-[180px] md:h-[220px] lg:w-[170px] lg:h-[220px] bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-0 max-w-[450px]:p-0 sm:p-0 md:p-0 lg:p-0 rounded-xl shadow-lg text-xs max-w-[450px]:text-xs sm:text-lg md:text-lg lg:text-xl font-extrabold transition-all duration-300 transform hover:scale-105 text-center leading-none ${
              pathname !== "/" || isLogoShrunk
                ? "scale-50 origin-top-left"
                : "scale-100"
            }`}
          >
            <img
              src={photoAsset}
              alt="Wandle Wheelhouse"
              className="w-full h-full object-cover rounded-xl"
            />
          </Link>
        </div>
      )}

      {/* --- Menu Island / Controls (Top Right) --- */}
      <div className="fixed top-6 right-6 z-30 flex items-center space-x-4 animate-fade-in">
        {/* --- Desktop Links & Auth (Hidden below lg) --- */}
        <div
          className={`hidden lg:flex ${
            isFixedNavbarRoute || isScrolled
              ? "bg-white/80 backdrop-blur-md border-gray-100"
              : "bg-transparent"
          } px-6 py-3 rounded-xl items-center space-x-6 border ${
            isFixedNavbarRoute || isScrolled ? "border-gray-100" : "border-transparent"
          } transition-all duration-300`}
        >
          <Link
            to="/"
            onClick={handleHomeClick}
            className={`text-lg font-semibold ${
              isFixedNavbarRoute || isScrolled
                ? "text-gray-800 hover:text-indigo-600"
                : "text-white hover:text-black text-outline"
            } transition-all duration-300 px-3 py-2 rounded-md hover:bg-indigo-50`}
          >
            Home
          </Link>
          <Link
            to="/mission"
            className={`text-lg font-semibold ${
              isFixedNavbarRoute || isScrolled
                ? "text-gray-800 hover:text-indigo-600"
                : "text-white hover:text-black text-outline"
            } transition-all duration-300 px-3 py-2 rounded-md hover:bg-indigo-50`}
          >
            Mission
          </Link>
          <Link
            to="/blog"
            className={`text-lg font-semibold ${
              isFixedNavbarRoute || isScrolled
                ? "text-gray-800 hover:text-indigo-600"
                : "text-white hover:text-black text-outline"
            } transition-all duration-300 px-3 py-2 rounded-md hover:bg-indigo-50`}
          >
            Blog
          </Link>
          <Link
            to="/contact"
            className={`text-lg font-semibold ${
              isFixedNavbarRoute || isScrolled
                ? "text-gray-800 hover:text-indigo-600"
                : "text-white hover:text-black text-outline"
            } transition-all duration-300 px-3 py-2 rounded-md hover:bg-indigo-50`}
          >
            Support us
          </Link>
          {isLoading && (
            <div className="flex space-x-4">
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          )}
          {!isLoading && !isAuthenticated && (
            <>
              <Button
                onClick={openLoginModal}
                variant="secondary"
                className={`text-base py-2 px-5 ${
                  isFixedNavbarRoute || isScrolled
                    ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    : "bg-transparent text-white border-white hover:bg-white/20 text-outline"
                } rounded-lg transition-transform hover:scale-105 border`}
              >
                Login
              </Button>
              <Button
                onClick={openRegisterModal}
                variant="primary"
                className={`text-base py-2 px-5 ${
                  isFixedNavbarRoute || isScrolled
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-transparent text-white border-white hover:bg-white/20 text-outline"
                } rounded-lg transition-transform hover:scale-105 border`}
              >
                Register
              </Button>
            </>
          )}
        </div>

        {/* --- User Avatar & Dropdown (Visible when logged in, all sizes) --- */}
        {!isLoading && isAuthenticated && user && (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={toggleUserDropdown}
              className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 rounded-full border-2 border-indigo-300 shadow-lg hover:shadow-xl transition-all duration-300 w-12 h-12 flex items-center justify-center"
              aria-haspopup="true"
              aria-expanded={isUserDropdownOpen}
              title="User Menu"
            >
              <Avatar
                name={user.firstName + " " + user.lastName}
                imageUrl={user.avatarUrl}
                size="lg"
                className="cursor-pointer w-full h-full object-cover rounded-full"
              />
            </button>
            {isUserDropdownOpen && (
              <div
                className={`absolute right-0 mt-3 w-56 ${
                  isFixedNavbarRoute || isScrolled
                    ? "bg-white/95 backdrop-blur-md"
                    : "bg-white/80 backdrop-blur-md"
                } rounded-xl shadow-xl py-3 z-50 ring-1 ring-black/5 border border-gray-100 animate-slide-in`}
              >
                <Link
                  to="/profile"
                  className="block px-5 py-3 text-base font-medium text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
                  onClick={() => setIsUserDropdownOpen(false)}
                >
                  Profile
                </Link>
                <div className="border-t border-gray-100 my-1"></div>
                {user.roles.includes("Member") &&
                  !user.roles.includes("Administrator") &&
                  !user.roles.includes("Editor") && (
                    <Link
                      to="/subscription"
                      className="block px-5 py-3 text-base font-medium text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
                      onClick={() => setIsUserDropdownOpen(false)}
                    >
                      Subscription
                    </Link>
                  )}
                {(user.roles.includes("Administrator") ||
                  user.roles.includes("Editor")) && (
                  <Link
                    to="/dashboard"
                    className="block px-5 py-3 text-base font-medium text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
                    onClick={() => setIsUserDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                {(user.roles.includes("Member") ||
                  user.roles.includes("Administrator") ||
                  user.roles.includes("Editor")) && (
                  <div className="border-t border-gray-100 my-1"></div>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-5 py-3 text-base font-medium text-gray-800 hover:bg-indigo-50 hover:text-indigo-600 rounded-md"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
        {isLoading && (
          <div className="w-12 h-12 bg-gray-800 rounded-full animate-pulse border-2 border-gray-300"></div>
        )}

        {/* --- Donate Button (Always Visible) --- */}
        <Button
          onClick={openDonateModal}
          variant="primary"
          className={`text-lg py-3 px-6 ${
            isFixedNavbarRoute || isScrolled
              ? "bg-green-600 hover:bg-green-700 border-green-400"
              : "bg-transparent hover:bg-green-700/20 border-white text-white text-outline"
          } rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 border-2 animate-[pulse-glow_1.5s_ease-in-out_infinite]`}
        >
          Donate
        </Button>

        {/* --- Hamburger Button & Mobile Menu Panel (Visible below lg) --- */}
        <div className="relative flex lg:hidden">
          <button
            ref={hamburgerRef}
            onClick={toggleMobileMenu}
            className={`p-3 rounded-xl ${
              isFixedNavbarRoute || isScrolled
                ? "bg-white/80 backdrop-blur-md hover:bg-gray-100"
                : "bg-transparent hover:bg-white/20"
            } focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-300`}
            aria-label="Toggle main menu"
            aria-expanded={isMobileMenuOpen}
          >
            <div className="relative w-8 h-8 flex flex-col justify-center items-center space-y-1.5">
              <span
                className={`block w-8 h-1 rounded-full transition-all duration-300 ease-in-out ${
                  isFixedNavbarRoute || isScrolled ? "bg-gray-800" : "bg-white icon-outline"
                } ${
                  isMobileMenuOpen
                    ? "absolute top-1/2 transform rotate-45"
                    : "transform translate-y-0"
                }`}
              ></span>
              <span
                className={`block w-8 h-1 rounded-full transition-all duration-300 ease-in-out ${
                  isFixedNavbarRoute || isScrolled ? "bg-gray-800" : "bg-white icon-outline"
                } ${isMobileMenuOpen ? "opacity-0" : "opacity-100"}`}
              ></span>
              <span
                className={`block w-8 h-1 rounded-full transition-all duration-300 ease-in-out ${
                  isFixedNavbarRoute || isScrolled ? "bg-gray-800" : "bg-white icon-outline"
                } ${
                  isMobileMenuOpen
                    ? "absolute top-1/2 transform -rotate-45"
                    : "transform translate-y-0"
                }`}
              ></span>
            </div>
          </button>
          {isMobileMenuOpen && (
            <div
              ref={mobileMenuRef}
              className={`absolute top-full right-0 mt-3 w-64 ${
                isFixedNavbarRoute || isScrolled
                  ? "bg-white/95 backdrop-blur-md"
                  : "bg-white/80 backdrop-blur-md"
                } rounded-xl shadow-xl py-3 z-50 ring-1 ring-black/5 border border-gray-100 animate-slide-in`}
            >
              <div className="flex flex-col px-3 py-2">
                <Link
                  to="/"
                  onClick={(e) => {
                    handleHomeClick(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block px-4 py-3 text-lg font-medium ${
                    isFixedNavbarRoute || isScrolled
                      ? "text-gray-800 hover:text-indigo-600"
                      : "text-gray-800 hover:text-indigo-600"
                  } hover:bg-indigo-50 rounded-md`}
                >
                  Home
                </Link>
                <Link
                  to="/mission"
                  className={`block px-4 py-3 text-lg font-medium ${
                    isFixedNavbarRoute || isScrolled
                      ? "text-gray-800 hover:text-indigo-600"
                      : "text-gray-800 hover:text-indigo-600"
                  } hover:bg-indigo-50 rounded-md`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Mission
                </Link>
                <Link
                  to="/blog"
                  className={`block px-4 py-3 text-lg font-medium ${
                    isFixedNavbarRoute || isScrolled
                      ? "text-gray-800 hover:text-indigo-600"
                      : "text-gray-800 hover:text-indigo-600"
                  } hover:bg-indigo-50 rounded-md`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  to="/contact"
                  className={`block px-4 py-3 text-lg font-medium ${
                    isFixedNavbarRoute || isScrolled
                      ? "text-gray-800 hover:text-indigo-600"
                      : "text-gray-800 hover:text-indigo-600"
                  } hover:bg-indigo-50 rounded-md`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Support
                </Link>
                <div className="border-t border-gray-200 my-2"></div>
                {!isLoading && !isAuthenticated && (
                  <>
                    <button
                      onClick={openLoginModal}
                      className={`block w-full text-left px-4 py-3 text-lg font-medium ${
                        isFixedNavbarRoute || isScrolled
                          ? "text-gray-800 hover:text-indigo-600"
                          : "text-gray-800 hover:text-indigo-600"
                      } hover:bg-indigo-50 rounded-md`}
                    >
                      Login
                    </button>
                    <button
                      onClick={openRegisterModal}
                      className={`block w-full text-left px-4 py-3 text-lg font-medium ${
                        isFixedNavbarRoute || isScrolled
                          ? "text-gray-800 hover:text-indigo-600"
                          : "text-gray-800 hover:text-indigo-600"
                      } hover:bg-indigo-50 rounded-md`}
                    >
                      Register
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Render Modals --- */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onRequestClose={closeLoginModal}
        onSwitchToRegister={switchToRegister}
      />
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onRequestClose={closeRegisterModal}
        onSwitchToLogin={switchToLogin}
      />
      <DonationModal
        isOpen={isDonateModalOpen}
        onRequestClose={closeDonateModal}
      />
    </>
  );
};

export default Navbar;