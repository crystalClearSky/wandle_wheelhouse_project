// src/services/NewsletterService.ts
import apiClient from './api';
import { NewsletterSubscriptionRequestDto } from '../dto/Newsletter/NewsletterSubscriptionRequestDto';
import axios from 'axios'; // For error checking

const NewsletterService = {
    subscribe: async (email: string): Promise<{ success: boolean; message: string }> => {
        const requestData: NewsletterSubscriptionRequestDto = { email };
        try {
            // Backend returns 204 No Content on success
            await apiClient.post('/newsletter/subscribe', requestData);
            return { success: true, message: 'Successfully subscribed!' };
        } catch (error: unknown) {
            console.error('Newsletter subscription error:', error);
            let message = 'Failed to subscribe. Please try again.';
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 409) { // Conflict - email exists
                    message = 'This email address is already subscribed.';
                } else {
                    // Use detailed message from backend if available
                    message = error.response?.data?.message || error.response?.data?.title || error.message || message;
                }
            } else if (error instanceof Error) {
                message = error.message;
            }
            // Return success: false and the error message
            return { success: false, message: message };
            // Alternatively, re-throw new Error(message) if preferred
        }
    },
};

export default NewsletterService;