// src/services/SubscriptionService.ts
import apiClient from './api';
import { SubscriptionResponseDto } from '../dto/Subscriptions/SubscriptionResponseDto';
import { SubscriptionRequestDto } from '../dto/Subscriptions/SubscriptionRequestDto'; // Import Request DTO
import axios from 'axios'; // For error checking

const SubscriptionService = {
    // Get subscriptions for the currently logged-in user
    getMySubscriptions: async (): Promise<SubscriptionResponseDto[]> => {
        try {
            const response = await apiClient.get<SubscriptionResponseDto[]>('/subscriptions/mine');
            return response.data;
        } catch (error: unknown) {
            console.error('Get my subscriptions error:', error);
            let message = 'Failed to load subscriptions.';
            if (axios.isAxiosError(error) && error.response?.status !== 401) { // Don't override 401 message
                message = error.response?.data?.message || error.message || message;
            } else if (error instanceof Error) { message = error.message; }
            // Re-throw error for component to handle (especially 401)
            throw new Error(message);
        }
    },

    // Cancel a specific subscription
    cancelSubscription: async (subscriptionId: string): Promise<void> => {
        try {
            // Backend returns 204 No Content on success
            await apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
        } catch (error: unknown) {
            console.error(`Cancel subscription ${subscriptionId} error:`, error);
            let message = 'Failed to cancel subscription.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) {
                message = error.response?.data?.message || error.response?.data?.title || error.message || message;
             } else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },

    // Create a Subscription
    createSubscription: async (data: SubscriptionRequestDto)
        : Promise<SubscriptionResponseDto> => {
        try {
            // Ensure amount is a number
            const dataToSend = { ...data, monthlyAmount: Number(data.monthlyAmount) };
            // Backend returns 201 Created on success with the new subscription details
            const response = await apiClient.post<SubscriptionResponseDto>('/subscriptions/create', dataToSend);
            return response.data;
        } catch (error: unknown) {
            console.error('Create subscription error:', error);
            let message = 'Failed to create subscription.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) {
                message = error.response?.data?.message || error.response?.data?.title || error.message || message;
             } else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },
};

export default SubscriptionService;