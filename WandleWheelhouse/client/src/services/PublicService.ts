// src/services/PublicService.ts
import apiClient from './api'; // Your configured Axios instance
import { ContactInquiryRequestDto } from '../dto/ContactInquiries/ContactInquiryRequestDto';
import axios from 'axios'; // For detailed error checking

const PublicService = {
    submitContactInquiry: async (data: ContactInquiryRequestDto): Promise<{ message: string }> => {
        try {
            // Assuming backend endpoint is /api/contactinquiries
            const response = await apiClient.post<{ message: string }>('/contactinquiries', data);
            return response.data; // Backend might return a success message
        } catch (error: unknown) {
            console.error('Submit Contact Inquiry error:', error);
            let message = 'Failed to submit your inquiry. Please try again later.';
            if (axios.isAxiosError(error) && error.response) {
                // Use message from backend if available
                message = error.response.data?.message || error.response.data?.title || error.message || message;
            } else if (error instanceof Error) {
                message = error.message;
            }
            throw new Error(message);
        }
    },

    // You can add other public-facing service methods here later
    // e.g., fetch public settings, etc.
};

export default PublicService;