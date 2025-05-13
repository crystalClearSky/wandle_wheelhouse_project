// Location: src/contexts/AuthContext.tsx

import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    useMemo,
    ReactNode
} from 'react';
import ProfileService from '../services/ProfileService';
import { UserDetailDto } from '../dto/Users/UserDetailDto';
import { UserInfoDto } from '../dto/Auth/UserInfoDto';
import axios from 'axios';

// Define the shape of the context data
interface AuthContextType {
    token: string | null;
    user: UserDetailDto | null;
    isAuthenticated: boolean;
    isLoading: boolean; // For initial auth check
    login: (newToken: string, newUserInfo: UserDetailDto | UserInfoDto) => void;
    logout: () => void;
    updateUserContext: (updatedUserInfo: Partial<UserDetailDto>) => void; // <-- For profile updates

    // --- Donation Modal State & Functions ---
    isDonationModalOpen: boolean;
    openDonationModal: () => void;
    closeDonationModal: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType>(null!); // null! assumes provider is always present

// Custom hook for easy access
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserDetailDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Donation Modal State ---
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);

    const openDonationModal = useCallback(() => {
        console.log("AuthContext: Opening Donation Modal");
        setIsDonationModalOpen(true);
    }, []);

    const closeDonationModal = useCallback(() => {
        console.log("AuthContext: Closing Donation Modal");
        setIsDonationModalOpen(false);
    }, []);
    // --- End Donation Modal State ---

    // Effect Hook for Initial Authentication Verification
    useEffect(() => {
        const verifyAuthOnLoad = async () => {
            const storedToken = localStorage.getItem('authToken');
            const storedUserString = localStorage.getItem('authUser');

            if (!storedToken) {
                console.log("AuthContext: No token found in storage on load.");
                setIsLoading(false);
                return;
            }
            console.log("AuthContext: Token found. Verifying...");

            // Optimistic load from storage for faster UI
            if (storedUserString) {
                try { setUser(JSON.parse(storedUserString)); setToken(storedToken); }
                catch { localStorage.removeItem('authUser'); setToken(storedToken); }
            } else {
                setToken(storedToken); // Set token for interceptor
            }

            try {
                const freshProfileData = await ProfileService.getMyProfile();
                console.log("AuthContext: Token verified. Updating state:", freshProfileData);
                setToken(storedToken); // Confirm token
                setUser(freshProfileData);
                localStorage.setItem('authUser', JSON.stringify(freshProfileData));
            } catch (error: unknown) {
                console.warn("AuthContext: Token verification failed.", error);
                let clearSession = false;
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    clearSession = true;
                } else {
                    clearSession = true; // Also clear for other verification errors
                }
                if (clearSession) {
                    setToken(null); setUser(null);
                    localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
                }
            } finally {
                setIsLoading(false);
                console.log("AuthContext: Initial loading/verification complete.");
            }
        };
        verifyAuthOnLoad();
    }, []); // Runs once on mount

    // LOGIN Function
    const login = useCallback((newToken: string, newUserInfo: UserDetailDto | UserInfoDto) => {
        console.log("AuthContext: login() called.", newUserInfo);
        let detailedUser: UserDetailDto;
        if ('id' in newUserInfo && 'emailConfirmed' in newUserInfo) {
            detailedUser = newUserInfo as UserDetailDto;
        } else {
            const basicInfo = newUserInfo as UserInfoDto;
            detailedUser = {
                id: basicInfo.userId, email: basicInfo.email, firstName: basicInfo.firstName,
                lastName: basicInfo.lastName, roles: basicInfo.roles, avatarUrl: basicInfo.avatarUrl,
                phoneNumber: null, emailConfirmed: false, lockoutEnabled: false,
                lockoutEnd: null, addressLine1: null, addressLine2: null,
                city: null, postCode: null, country: null,
            };
        }
        setToken(newToken);
        setUser(detailedUser);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(detailedUser));
    }, []);

    // LOGOUT Function
    const logout = useCallback(() => {
        console.log("AuthContext: logout() called.");
        setToken(null); setUser(null);
        localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
        setIsDonationModalOpen(false); // Also close donation modal on logout
    }, []);

    // --- NEW: Function to update user context (e.g., after profile edit/avatar change) ---
    const updateUserContext = useCallback((updatedUserInfo: Partial<UserDetailDto>) => {
        setUser(prevUser => {
            if (!prevUser) {
                console.warn("AuthContext: updateUserContext called but no previous user state found.");
                return null;
            }
            const newUserState = { ...prevUser, ...updatedUserInfo };
            localStorage.setItem('authUser', JSON.stringify(newUserState));
            console.log("AuthContext: User context updated by updateUserContext:", newUserState);
            return newUserState;
        });
    }, []);
    // --- End NEW Function ---

    // Context Value (Memoized)
    const value = useMemo(() => ({
        token,
        user,
        isAuthenticated: !isLoading && !!token && !!user,
        isLoading,
        login,
        logout,
        updateUserContext,        // <-- Add to value
        isDonationModalOpen,      // <-- Add to value
        openDonationModal,        // <-- Add to value
        closeDonationModal,       // <-- Add to value
    }), [
        token, user, isLoading, login, logout, updateUserContext, // <-- Add updateUserContext
        isDonationModalOpen, openDonationModal, closeDonationModal // <-- Add modal state and functions
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// export { AuthContext };