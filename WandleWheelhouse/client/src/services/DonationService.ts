// src/services/DonationService.ts
import apiClient from './api';
import { DonationRequestDto } from '../dto/Donations/DonationRequestDto';
import { DonationResponseDto } from '../dto/Donations/DonationResponseDto';
import axios from 'axios'; // For error checking

const DonationService = {
    processDonation: async (donationData: DonationRequestDto)
        : Promise<DonationResponseDto> => {
        try {
            // Ensure amount is sent as a number (string input might need parseFloat)
            const dataToSend = {
                ...donationData,
                amount: Number(donationData.amount) // Explicitly ensure it's a number
            };
            const response = await apiClient.post<DonationResponseDto>('/donations/process', dataToSend);
            // Backend returns 201 Created on success (or 200 OK if payment failed but donation recorded)
            // Axios treats 201 as success.
            return response.data;
        } catch (error: unknown) {
            console.error('Process donation API error:', error);
            let message = 'Failed to process donation. Please try again.';
             if (axios.isAxiosError(error)) {
                // Use detailed message from backend if available
                message = error.response?.data?.message || error.response?.data?.title || error.message || message;
             } else if (error instanceof Error) {
                message = error.message;
             }
            throw new Error(message);
        }
    },
};

export default DonationService;