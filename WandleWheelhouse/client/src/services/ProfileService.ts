// src/services/ProfileService.ts
import apiClient from './api';
import axios from 'axios';
import { UserDetailDto } from '../dto/Users/UserDetailDto'; // For return types
import { UserProfileUpdateDto } from '../dto/Users/UserProfileUpdateDto'; // For update method

// Expected response structure from POST /api/users/me/avatar
interface AvatarUploadResponse {
    avatarUrl: string; // Relative URL path
}

const ProfileService = {
    // Function to upload the user's avatar
    uploadAvatar: async (file: File): Promise<AvatarUploadResponse> => {
        const formData = new FormData();
        formData.append('file', file); // Key 'file' must match backend parameter name

        try {
            const response = await apiClient.post<AvatarUploadResponse>(
                '/users/me/avatar', // Backend endpoint URL
                formData // Send FormData
            );
            return response.data; // Expects { avatarUrl: "/path/to/image.jpg" }
        } catch (error: unknown) {
             console.error('Avatar upload API error:', error);
             let message = 'Failed to upload avatar.';
             if (axios.isAxiosError(error)) {
                message = error.response?.data?.message
                       || error.response?.data?.title // Check for ProblemDetails title
                       || error.message
                       || message;
             } else if (error instanceof Error) { message = error.message; }
             throw new Error(message); // Re-throw for the component to catch
        }
    },

    // Function to get the current logged-in user's profile data
    getMyProfile: async (): Promise<UserDetailDto> => {
        try {
            const response = await apiClient.get<UserDetailDto>('/users/me/profile');
            return response.data;
        } catch (error: unknown) {
             console.error('Get my profile API error:', error);
             // Let AuthContext handle 401 specifically, throw others
             if (axios.isAxiosError(error) && error.response?.status !== 401) {
                 let message = 'Failed to fetch profile.';
                 message = error.response?.data?.message || error.message || message;
                 throw new Error(message);
             }
             // Re-throw original error (likely AxiosError including 401) for AuthContext to handle
             throw error;
        }
    },

    // Function to update user profile details
    updateMyProfile: async (data: UserProfileUpdateDto): Promise<UserDetailDto> => {
        try {
            // Use PUT request to the /users/me/profile endpoint
            const response = await apiClient.put<UserDetailDto>('/users/me/profile', data);
            // Backend should return the updated UserDetailDto on success
            return response.data;
        } catch (error: unknown) {
             console.error('Update profile error:', error);
             let message = 'Failed to update profile.';
             if (axios.isAxiosError(error)) {
                // Check for validation errors specifically
                if (error.response?.data?.errors && typeof error.response.data.errors === 'object') {
                    // Flatten validation errors into a single message (simple approach)
                    message = Object.values(error.response.data.errors).flat().join(' ');
                } else {
                     message = error.response?.data?.message || error.response?.data?.title || error.message || message;
                }
             } else if (error instanceof Error) { message = error.message; }
             throw new Error(message);
        }
    },

    // Function to delete user's own account
    deleteMyAccount: async (): Promise<void> => {
        try {
            // Backend returns 204 No Content on success
            await apiClient.delete('/users/me/delete-account');
        } catch (error: unknown) {
            console.error('Delete account API error:', error);
            let message = 'Failed to delete account.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) {
                 message = error.response?.data?.message || error.response?.data?.title || error.message || message;
             } else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    }
};

export default ProfileService;