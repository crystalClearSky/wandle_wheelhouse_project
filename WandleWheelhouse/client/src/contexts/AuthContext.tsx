import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserInfoDto } from '../dto/Auth/UserInfoDto'; // Updated import

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfoDto | null; // Updated to UserInfoDto
  isLoading: boolean;
  login: (token: string, userInfo: UserInfoDto) => void; // Updated to UserInfoDto
  logout: () => void;
  isDonationModalOpen: boolean;
  openDonationModal: () => void;
  closeDonationModal: () => void;
  activeAuthModal: 'login' | 'register' | 'forgotPassword' | null;
  openAuthModal: (modal: 'login' | 'register' | 'forgotPassword') => void;
  closeAuthModal: () => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfoDto | null>(null); // Updated to UserInfoDto
  const [isLoading, setIsLoading] = useState(true);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [activeAuthModal, setActiveAuthModal] = useState<'login' | 'register' | 'forgotPassword' | null>(null);
  const [loginEmail, setLoginEmail] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token: string, userInfo: UserInfoDto) => { // Updated to UserInfoDto
    setIsAuthenticated(true);
    setUser(userInfo);
    setLoginEmail('');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setLoginEmail('');
  };

  const openDonationModal = () => setIsDonationModalOpen(true);
  const closeDonationModal = () => setIsDonationModalOpen(false);

  const openAuthModal = (modal: 'login' | 'register' | 'forgotPassword') => {
    setActiveAuthModal(modal);
  };

  const closeAuthModal = () => {
    setActiveAuthModal(null);
    setLoginEmail('');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        isDonationModalOpen,
        openDonationModal,
        closeDonationModal,
        activeAuthModal,
        openAuthModal,
        closeAuthModal,
        loginEmail,
        setLoginEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};