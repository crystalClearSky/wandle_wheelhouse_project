// Location: src/services/AuthService.ts

import apiClient from './api'; // Your configured Axios instance
import { LoginDto } from '../dto/Auth/LoginDto';
import { RegisterDto } from '../dto/Auth/RegisterDto';
import { AuthResponseDto } from '../dto/Auth/AuthResponseDto';
import axios from 'axios'; // For error checking

// --- DTOs for Password Reset ---
export interface ForgotPasswordRequestDto {
  email: string;
}

export interface ResetPasswordRequestDto {
  email: string;
  token: string; // The URL-safe encoded token
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordActionResponseDto {
  message: string;
  isSuccess?: boolean; // Optional, good for consistency
}
// --- End DTOs ---

const AuthService = {
    login: async (credentials: LoginDto): Promise<AuthResponseDto> => {
        try {
            const response = await apiClient.post<AuthResponseDto>('/auth/login', credentials);
            if (!response.data.isSuccess || !response.data.token || !response.data.userInfo) {
                throw new Error(response.data.message || 'Login failed: Invalid response from server.');
            }
            return response.data;
        } catch (error: unknown) {
            console.error('Login API error:', error);
            let message = 'Login failed. Please check credentials and try again.';
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.response?.data?.title || error.message || message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            throw new Error(message);
        }
    },

    register: async (userData: RegisterDto): Promise<AuthResponseDto> => {
         try {
            const response = await apiClient.post<AuthResponseDto>('/auth/register', userData);
            if (!response.data.isSuccess) {
                throw new Error(response.data.message || 'Registration failed: Invalid response from server.');
            }
            return response.data;
        } catch (error: unknown) {
            console.error('Register API error:', error);
            let message = 'Registration failed. Please try again.';
            if (axios.isAxiosError(error)) {
                if (error.response?.data?.errors && typeof error.response.data.errors === 'object') {
                    message = Object.values(error.response.data.errors).flat().join(' ');
                } else {
                    message = error.response?.data?.message || error.response?.data?.title || error.message || message;
                }
            } else if (error instanceof Error) {
                message = error.message;
            }
            throw new Error(message);
        }
    },

    // --- NEW: Forgot Password Method ---
    forgotPassword: async (data: ForgotPasswordRequestDto): Promise<PasswordActionResponseDto> => {
        try {
            const response = await apiClient.post<PasswordActionResponseDto>('/auth/forgot-password', data);
            return response.data; // Expects { message: "..." }
        } catch (error: unknown) {
            console.error('Forgot Password API error:', error);
            let message = 'Failed to send password reset email. Please try again.';
            if (axios.isAxiosError(error)) {
                message = error.response?.data?.message || error.response?.data?.title || error.message || message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            throw new Error(message);
        }
    },
    // --- End Forgot Password Method ---

    // --- NEW: Reset Password Method ---
    resetPassword: async (data: ResetPasswordRequestDto): Promise<PasswordActionResponseDto> => {
        try {
            const response = await apiClient.post<PasswordActionResponseDto>('/auth/reset-password', data);
            return response.data; // Expects { message: "..." }
        } catch (error: unknown) {
            console.error('Reset Password API error:', error);
            let message = 'Failed to reset password. The link may be invalid/expired or password too weak.';
             if (axios.isAxiosError(error)) {
                message = error.response?.data?.detail || error.response?.data?.title || error.message || message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            throw new Error(message);
        }
    },
    // --- End Reset Password Method ---
};

export default AuthService;