// Location: src/services/AuthService.ts

import apiClient from './api'; // Your configured Axios instance
import { LoginDto } from '../dto/Auth/LoginDto';
import { RegisterDto } from '../dto/Auth/RegisterDto';
import { AuthResponseDto } from '../dto/Auth/AuthResponseDto';
import axios from 'axios'; // For error checking

const AuthService = {
    // Handles the login API call
    login: async (credentials: LoginDto): Promise<AuthResponseDto> => {
        try {
            const response = await apiClient.post<AuthResponseDto>('/auth/login', credentials);
            // Check for success and required data from backend response DTO
            if (!response.data.isSuccess || !response.data.token || !response.data.userInfo) {
                 // Throw error if backend indicates failure or data is missing
                 throw new Error(response.data.message || 'Login failed: Invalid response from server.');
            }
            return response.data; // Return the full success response DTO
        } catch (error: unknown) { // Catch error as unknown
            console.error('Login API error:', error);
            let message = 'Login failed. Please check credentials and try again.';
            // Extract specific message if it's an Axios error
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.message || message;
            } else if (error instanceof Error) { // Fallback for standard JS errors
                message = error.message;
            }
            throw new Error(message); // Re-throw a user-friendly error
        }
    },

    // Handles the registration API call
    register: async (userData: RegisterDto): Promise<AuthResponseDto> => {
         try {
            const response = await apiClient.post<AuthResponseDto>('/auth/register', userData);
             // Check our custom isSuccess flag from the backend response DTO
             if (!response.data.isSuccess) {
                 throw new Error(response.data.message || 'Registration failed: Invalid response from server.');
             }
            // Successful registration only returns { isSuccess: true, message: '...' }
            return response.data;
        } catch (error: unknown) { // Catch error as unknown
            console.error('Register API error:', error);
            let message = 'Registration failed. Please try again.';
            // Extract specific message if it's an Axios error
            if (axios.isAxiosError(error)) {
                 // Check for specific validation errors if backend provides them
                 if (error.response?.data?.errors && typeof error.response.data.errors === 'object') {
                    message = Object.values(error.response.data.errors).flat().join(' ');
                 } else {
                     message = error.response?.data?.message || error.response?.data?.title || error.message || message;
                 }
            } else if (error instanceof Error) {
                message = error.message;
            }
            throw new Error(message); // Re-throw a user-friendly error
        }
    },

    // Logout is client-side only for JWT Bearer unless using blacklisting
    // logout: async (): Promise<void> => { /* ... */ }
};

export default AuthService;