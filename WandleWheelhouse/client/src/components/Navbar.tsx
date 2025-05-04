// Location: src/components/Navbar.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../modals/LoginModal';
import RegisterModal from '../modals/RegisterModal';
import DonationModal from '../modals/DonationModal';
import Button from './ui/Button';
import Avatar from './ui/Avatar';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  // --- State ---
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Refs for closing menus ---
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null); // Ref for hamburger button itself

  // --- Handlers ---
  const openLoginModal = () => { setIsMobileMenuOpen(false); setIsLoginModalOpen(true); };
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const openRegisterModal = () => { setIsMobileMenuOpen(false); setIsRegisterModalOpen(true); };
  const closeRegisterModal = () => setIsRegisterModalOpen(false);
  const openDonateModal = () => setIsDonateModalOpen(true);
  const closeDonateModal = () => setIsDonateModalOpen(false);
  const handleLogout = () => { setIsUserDropdownOpen(false); setIsMobileMenuOpen(false); logout(); };
  const switchToRegister = () => { closeLoginModal(); openRegisterModal(); };
  const switchToLogin = () => { closeRegisterModal(); openLoginModal(); };
  const toggleUserDropdown = () => setIsUserDropdownOpen(prev => !prev);
  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

  // --- Click Outside Handler ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Close user dropdown if click is outside its ref
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setIsUserDropdownOpen(false);
      }
      // Close mobile menu if click is outside its ref AND outside the hamburger button ref
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target) &&
          hamburgerRef.current && !hamburgerRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isUserDropdownOpen || isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen, isMobileMenuOpen]);

  // --- Initials Helper (SHOULD BE DELETED IF USING UTILITY FUNCTION) ---
  // This local definition is likely causing the 'assigned a value but never used' error
  // because the Avatar component uses the imported utility version.
  // Consider deleting this block.
  // const getInitials = (firstName?: string, lastName?: string): string => { return `${firstName?.charAt(0)??""}${lastName?.charAt(0)??""}`||"?"; }


  return (
    <>
      {/* --- Logo (Top Left) --- */}
      <div className="fixed top-4 left-4 z-50">
         <Link
           to="/"
           className="block bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg text-xl font-bold hover:from-blue-700 hover:to-indigo-800 transition duration-200"
         >
            Wandle Wheelhouse
         </Link>
      </div>

      {/* --- Menu Island / Controls (Top Right) --- */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">

          {/* --- Desktop Links & Auth (Hidden below lg) --- */}
          {/* Increased text size and button padding/text size */}
          <div className="hidden lg:flex bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg items-center space-x-4">
              {/* Links updated to text-base */}
              <Link to="/" className="text-base text-gray-700 hover:text-blue-600 transition duration-200 px-2">Home</Link>
              <Link to="/mission" className="text-base text-gray-700 hover:text-blue-600 transition duration-200 px-2">Mission</Link>
              <Link to="/blog" className="text-base text-gray-700 hover:text-blue-600 transition duration-200 px-2">Blog</Link>
              {/* Desktop Login/Register Buttons - Updated Size */}
              {!isLoading && !isAuthenticated && (
                <>
                  <Button onClick={openLoginModal} variant="secondary" className="text-sm py-1.5 px-3">Login</Button>
                  <Button onClick={openRegisterModal} variant="primary" className="text-sm py-1.5 px-3 bg-blue-600 text-white hover:bg-blue-700">Register</Button>
                </>
              )}
          </div>
          {/* --- End Desktop Links & Auth --- */}

          {/* --- User Avatar & Dropdown (Visible when logged in, all sizes) --- */}
          {!isLoading && isAuthenticated && user && (
             <div className="relative ml-2 lg:ml-0" ref={userDropdownRef}> {/* Adjust margin for spacing */}
                 <button onClick={toggleUserDropdown} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 rounded-full" aria-haspopup="true" aria-expanded={isUserDropdownOpen} title="User Menu">
                     <Avatar name={user.firstName + ' ' + user.lastName} imageUrl={user.avatarUrl} size="md" className="cursor-pointer"/>
                 </button>
                 {/* User Dropdown Menu */}
                 {isUserDropdownOpen && (
                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-60 ring-1 ring-black ring-opacity-5">
                         <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsUserDropdownOpen(false)}>Profile</Link>
                         <div className="border-t border-gray-100 my-1"></div>
                         {user.roles.includes('Member') && !user.roles.includes('Administrator') && !user.roles.includes('Editor') && (<Link to="/subscription" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsUserDropdownOpen(false)}>Subscription</Link>)}
                         {(user.roles.includes('Administrator') || user.roles.includes('Editor')) && (<Link to="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsUserDropdownOpen(false)}>Dashboard</Link>)}
                         {/* Only show separator if role links were present */}
                         {(user.roles.includes('Member') || user.roles.includes('Administrator') || user.roles.includes('Editor')) && (
                              <div className="border-t border-gray-100 my-1"></div>
                         )}
                         <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
                     </div>
                 )}
             </div>
          )}
          {/* --- End User Avatar & Dropdown --- */}

           {/* --- Donate Button (Always Visible) --- Updated Size */}
           <Button onClick={openDonateModal} variant="primary" className="text-lg py-3 px-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg">Donate</Button>

           {/* --- Hamburger Button & Mobile Menu Panel (Visible below lg) --- */}
           <div className="relative flex lg:hidden">
               <button
                    ref={hamburgerRef}
                    onClick={toggleMobileMenu}
                    className="p-2 rounded bg-white shadow-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
                    aria-label="Toggle main menu"
                    aria-expanded={isMobileMenuOpen}
               >
                   <svg className="h-6 w-6 text-gray-700" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                   </svg>
               </button>
               {/* Mobile Menu Panel */}
               {isMobileMenuOpen && (
                    <div ref={mobileMenuRef} className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-60 ring-1 ring-black ring-opacity-5">
                        <div className="flex flex-col px-2 py-1">
                            {/* Links for mobile menu */}
                            <Link to="/" className="block px-3 py-2 rounded text-base font-medium text-gray-700 hover:bg-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
                            <Link to="/mission" className="block px-3 py-2 rounded text-base font-medium text-gray-700 hover:bg-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Mission</Link>
                            <Link to="/blog" className="block px-3 py-2 rounded text-base font-medium text-gray-700 hover:bg-gray-100" onClick={() => setIsMobileMenuOpen(false)}>Blog</Link>
                            <div className="border-t border-gray-200 my-2"></div>
                            {/* Auth actions for mobile menu if NOT logged in (logged in handled by avatar dropdown) */}
                            {!isLoading && !isAuthenticated && (
                                <>
                                    <button onClick={openLoginModal} className="block w-full text-left px-3 py-2 rounded text-base font-medium text-gray-700 hover:bg-gray-100">Login</button>
                                    <button onClick={openRegisterModal} className="block w-full text-left px-3 py-2 rounded text-base font-medium text-gray-700 hover:bg-gray-100">Register</button>
                                </>
                            )}
                        </div>
                    </div>
               )}
           </div>
           {/* --- End Hamburger Button & Mobile Menu Panel --- */}

      </div>
      {/* --- End Menu Island / Controls --- */}


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

      {/* Reminder: You might need padding-top on <main> in Layout.tsx if content overlaps */}
    </>
  );
};

export default Navbar;