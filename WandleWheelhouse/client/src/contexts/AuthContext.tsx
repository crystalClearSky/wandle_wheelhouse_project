// Location: src/contexts/AuthContext.tsx

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback, // Import useCallback
  useMemo,     // Import useMemo
  ReactNode
} from 'react';
import ProfileService from '../services/ProfileService';
import { UserDetailDto } from '../dto/Users/UserDetailDto';
import { UserInfoDto } from '../dto/Auth/UserInfoDto';
import axios from 'axios';

// Define the shape of the context data
interface AuthContextType {
token: string | null;
user: UserDetailDto | null; // Context holds the detailed user info
isAuthenticated: boolean;
isLoading: boolean;
// Login function can accept either type, but internally works towards UserDetailDto
login: (newToken: string, newUserInfo: UserDetailDto | UserInfoDto) => void;
logout: () => void;
}

// Create the context - null! assumes provider is always present
const AuthContext = createContext<AuthContextType>(null!);

// Custom hook for easy access
export const useAuth = () => {
const context = useContext(AuthContext);
if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
}
return context;
};

// Props for the provider
interface AuthProviderProps {
children: ReactNode;
}

// AuthProvider component implementation
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
const [token, setToken] = useState<string | null>(null);
const [user, setUser] = useState<UserDetailDto | null>(null); // State holds UserDetailDto
const [isLoading, setIsLoading] = useState(true); // For initial load verification

// Effect Hook for Initial Authentication Verification on load/refresh
useEffect(() => {
  const verifyAuthOnLoad = async () => {
     const storedToken = localStorage.getItem('authToken');
     const storedUserString = localStorage.getItem('authUser');

     if (!storedToken) {
         console.log("AuthContext: No token found in storage on load.");
         setIsLoading(false);
         return;
     }

     console.log("AuthContext: Token found in storage. Verifying with API...");

     // Optimistic load from storage for faster UI, verification will correct if needed
     if (storedUserString) {
          try { setUser(JSON.parse(storedUserString)); setToken(storedToken); }
          catch { localStorage.removeItem('authUser'); setToken(storedToken); /* Only set token */ }
     } else {
          setToken(storedToken); // Ensure token is set for interceptor
     }

     try {
         // Verify token by fetching full profile (uses interceptor)
         const freshProfileData = await ProfileService.getMyProfile(); // Returns UserDetailDto
         console.log("AuthContext: Token verified via API. Updating state:", freshProfileData);

         // Update state with fresh data
         setToken(storedToken);
         setUser(freshProfileData);
         localStorage.setItem('authUser', JSON.stringify(freshProfileData)); // Refresh storage

     } catch (error: unknown) {
         console.warn("AuthContext: Token verification failed.", error);
         let clearSession = false;
         if (axios.isAxiosError(error) && error.response?.status === 401) {
             console.log("AuthContext: Invalid/expired token. Clearing state/storage.");
             clearSession = true;
         } else {
             console.error("AuthContext: Non-401 error during token verification:", error);
             clearSession = true; // Also clear session on other verification errors
         }
         if(clearSession) {
             setToken(null); setUser(null);
             localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
         }
     } finally {
         setIsLoading(false);
         console.log("AuthContext: Initial loading/verification complete.");
     }
  };

  verifyAuthOnLoad();
}, []); // Empty dependency array: runs only once on mount

// LOGIN Function (Memoized)
const login = useCallback((newToken: string, newUserInfo: UserDetailDto | UserInfoDto) => {
  console.log("AuthContext: login() called.", newUserInfo);

  // Ensure we are working with the UserDetailDto structure for state/storage
  let detailedUser: UserDetailDto;
  if ('id' in newUserInfo && 'emailConfirmed' in newUserInfo) { // Check for fields unique to UserDetailDto
      detailedUser = newUserInfo as UserDetailDto;
  } else {
      // Map UserInfoDto to UserDetailDto, setting unknown fields appropriately
      const basicInfo = newUserInfo as UserInfoDto;
      detailedUser = {
          id: basicInfo.userId, email: basicInfo.email, firstName: basicInfo.firstName,
          lastName: basicInfo.lastName, roles: basicInfo.roles, avatarUrl: basicInfo.avatarUrl,
          // Initialize other fields - these will be updated on next page load via verifyAuthOnLoad
          phoneNumber: null, emailConfirmed: false, // Assume false until verified
          lockoutEnabled: false, lockoutEnd: null, addressLine1: null,
          addressLine2: null, city: null, postCode: null, country: null,
      };
      console.log("AuthContext: Mapped UserInfoDto to UserDetailDto for state.", detailedUser);
  }

  setToken(newToken);
  setUser(detailedUser);
  localStorage.setItem('authToken', newToken);
  localStorage.setItem('authUser', JSON.stringify(detailedUser));
}, []); // No dependencies needed as it only uses args and sets state


// LOGOUT Function (Memoized)
const logout = useCallback(() => {
  console.log("AuthContext: logout() called.");
  setToken(null);
  setUser(null);
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
}, []); // No dependencies needed


// Context Value (Memoized)
// Including login/logout in dependencies is optional now they use useCallback,
// but kept for explicit dependency tracking.
const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: !isLoading && !!token && !!user,
    isLoading,
    login, // Provide the memoized login function
    logout, // Provide the memoized logout function
}), [token, user, isLoading, login, logout]);


// Provider component rendering children
return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
);
};