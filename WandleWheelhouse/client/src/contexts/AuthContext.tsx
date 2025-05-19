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
import { UserDetailDto } from '../dto/Users/UserDetailDto'; // <-- IMPORT UserDetailDto
import { UserInfoDto } from '../dto/Auth/UserInfoDto';     // Still useful for login response type
// import axios from 'axios';

// Define types for active auth modals
export type ActiveAuthModalType =
    | null
    | 'login'
    | 'register'
    | 'forgotPassword';

// Define the shape of the context data
export interface AuthContextType {
    token: string | null;
    user: UserDetailDto | null; // <-- USER IS NOW UserDetailDto
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (newToken: string, userInfoFromLogin: UserInfoDto) => Promise<void>; // login can take UserInfoDto initially
    logout: () => void;
    updateUserContext: (updatedUserInfo: Partial<UserDetailDto>) => void;

    isDonationModalOpen: boolean;
    openDonationModal: () => void;
    closeDonationModal: () => void;

    activeAuthModal: ActiveAuthModalType;
    openAuthModal: (modalType: ActiveAuthModalType) => void;
    closeAuthModal: () => void;

    loginEmail: string; // From your provided code
    setLoginEmail: React.Dispatch<React.SetStateAction<string>>; // From your provided code
}

const AuthContext = createContext<AuthContextType>(null!);

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
    const [user, setUser] = useState<UserDetailDto | null>(null); // <-- STATE IS UserDetailDto
    const [isLoading, setIsLoading] = useState(true);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [activeAuthModal, setActiveAuthModal] = useState<ActiveAuthModalType>(null);
    const [loginEmail, setLoginEmail] = useState(''); // From your provided code

    const openDonationModal = useCallback(() => setIsDonationModalOpen(true), []);
    const closeDonationModal = useCallback(() => setIsDonationModalOpen(false), []);
    const openAuthModal = useCallback((modalType: ActiveAuthModalType) => setActiveAuthModal(modalType), []);
    const closeAuthModal = useCallback(() => {
        setActiveAuthModal(null);
        setLoginEmail(''); // Reset loginEmail when any auth modal closes
    }, []);

    const clearAuthData = useCallback(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        closeDonationModal();
        closeAuthModal();
        setLoginEmail('');
        console.log("AuthContext: Session data cleared.");
    }, [closeDonationModal, closeAuthModal]);


    useEffect(() => {
        const verifyAuthOnLoad = async () => {
            const storedToken = localStorage.getItem('authToken');
            const storedUserString = localStorage.getItem('authUser'); // This should store UserDetailDto

            if (!storedToken) {
                console.log("AuthContext: No token found in storage on load.");
                clearAuthData(); // Ensure everything is cleared if no token
                setIsLoading(false);
                return;
            }
            console.log("AuthContext: Token found. Attempting to load user and verify...");
            setToken(storedToken); // Set token for ProfileService.getMyProfile()

            if (storedUserString) {
                try {
                    const parsedUser = JSON.parse(storedUserString) as UserDetailDto;
                    // Basic check if it looks like UserDetailDto (has more fields than UserInfoDto)
                    if (parsedUser && parsedUser.id && typeof parsedUser.emailConfirmed === 'boolean') {
                        setUser(parsedUser);
                        console.log("AuthContext: User optimistically loaded from localStorage.");
                    } else {
                        throw new Error("Stored user is not UserDetailDto");
                    }
                } catch (e) {
                    console.warn("AuthContext: Failed to parse stored UserDetailDto from localStorage or it was invalid. Will attempt to re-fetch.", console.log(e));
                    localStorage.removeItem('authUser'); // Clear potentially corrupted/outdated item
                }
            }
            
            try {
                const freshProfileData = await ProfileService.getMyProfile(); // Fetches UserDetailDto
                console.log("AuthContext: Token verified via API. Updating state:", freshProfileData);
                setUser(freshProfileData); // Store the full UserDetailDto
                localStorage.setItem('authUser', JSON.stringify(freshProfileData)); // Refresh storage
            } catch (error) {
                console.warn("AuthContext: Token verification failed. Clearing session.", error);
                clearAuthData();
            } finally {
                setIsLoading(false);
                console.log("AuthContext: Initial loading/verification complete.");
            }
        };
        verifyAuthOnLoad();
    }, [clearAuthData]); // Include clearAuthData in dependencies

    // LOGIN Function: Takes UserInfoDto from login response, then fetches full UserDetailDto
    const login = useCallback(async (newToken: string, userInfoFromLogin: UserInfoDto) => {
        console.log("AuthContext: login() called with basic UserInfoDto:", userInfoFromLogin);
        localStorage.setItem('authToken', newToken); // Store token immediately
        setToken(newToken);

        // Optimistically set basic info first for quicker UI update
        const optimisticUserDetail: UserDetailDto = {
            ...userInfoFromLogin, // Spread basic info
            id: userInfoFromLogin.userId, // Map userId to id
            // Initialize other UserDetailDto fields as null/default
            // These will be overwritten by freshProfileData shortly
            phoneNumber: null, emailConfirmed: false, lockoutEnabled: false, lockoutEnd: null,
            addressLine1: null, addressLine2: null, city: null, postCode: null, country: null,
        };
        setUser(optimisticUserDetail);
        localStorage.setItem('authUser', JSON.stringify(optimisticUserDetail)); // Store optimistically


        try {
            // Fetch the full UserDetailDto after successful login
            // The token is already set, so ProfileService.getMyProfile() will use it
            const freshProfileData = await ProfileService.getMyProfile();
            setUser(freshProfileData);
            localStorage.setItem('authUser', JSON.stringify(freshProfileData));
            console.log("AuthContext: Full UserDetailDto fetched and stored after login:", freshProfileData);
        } catch (error) {
            console.error("AuthContext: Failed to fetch full profile after login. User might have basic info only.", error);
            // The context will still have the optimisticUserDetail set from UserInfoDto
        }
        
        closeAuthModal();
        setLoginEmail(''); // Reset from your original logic
    }, [closeAuthModal]);

    // LOGOUT Function
    const logout = useCallback(() => {
        console.log("AuthContext: logout() called.");
        clearAuthData();
    }, [clearAuthData]);

    // Function to update user context (e.g., after profile edit/avatar change)
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

    const value: AuthContextType = useMemo(() => ({
        token,
        user, // This is now UserDetailDto | null
        isAuthenticated: !isLoading && !!token && !!user,
        isLoading,
        login,
        logout,
        updateUserContext,
        isDonationModalOpen,
        openDonationModal,
        closeDonationModal,
        activeAuthModal,
        openAuthModal,
        closeAuthModal,
        loginEmail,      // From your provided code
        setLoginEmail,   // From your provided code
    }), [
        token, user, isLoading, login, logout, updateUserContext,
        isDonationModalOpen, openDonationModal, closeDonationModal,
        activeAuthModal, openAuthModal, closeAuthModal,
        loginEmail // Added loginEmail to dependency array
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};