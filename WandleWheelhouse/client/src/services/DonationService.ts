// src/services/DonationService.ts
import apiClient from './api'; // Assuming this is your configured Axios instance
import { DonationRequestDto } from '../dto/Donations/DonationRequestDto';
import { DonationResponseDto } from '../dto/Donations/DonationResponseDto';
import { PaymentMethod } from '../dto/Donations/PaymentMethodEnum';
import axios from 'axios';

// Interface for the response from /initiate-stripe-donation
export interface InitiateStripeDonationResponse {
  donationId: string;
  stripeClientSecret: string;
  publishableKey: string;
}

// This payload type is what the initiateStripeDonation function in this service expects.
// It's derived from the client-side DTO and includes everything needed for the API call.
// Ensure your client-side DonationRequestDto has all these fields (including billing address).
export type InitiateStripeDonationApiPayload = Omit<
  DonationRequestDto,
  'method' | 'isRecurring' | 'subscriptionId' // These are set by the service/backend for this specific flow
>;
// Note: If DonationRequestDto (client-side) already includes billing address fields as optional,
// then InitiateStripeDonationApiPayload will also include them.

const DonationService = {
  processDonation: async (donationData: DonationRequestDto): Promise<DonationResponseDto> => {
    try {
      const dataToSend = {
        ...donationData,
        amount: Number(donationData.amount), // Ensure amount is a number
      };
      const response = await apiClient.post<DonationResponseDto>('/donations/process', dataToSend);
      return response.data;
    } catch (error: unknown) {
      console.error('Process donation API error:', error);
      let message = 'Failed to process donation. Please try again.';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.response?.data?.title || error.message || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      throw new Error(message);
    }
  },

  initiateStripeDonation: async (
    payload: InitiateStripeDonationApiPayload // This payload should now include billing address fields from the form
  ): Promise<InitiateStripeDonationResponse> => {
    try {
      // Construct the full DTO that the backend endpoint /api/donations/initiate-stripe-donation expects
      const backendPayload: DonationRequestDto = {
        ...payload, // Spreads amount, currency, donorInfo, and billingAddress from payload
        amount: Number(payload.amount), // Ensure amount is a number (should be in cents/pence for API)
        method: PaymentMethod.Stripe,   // Set payment method to Stripe
        currency: payload.currency?.toLowerCase() || 'gbp', // Default/normalize
        isRecurring: false,
        subscriptionId: null, // Or undefined
        // Billing address fields from payload will be included here due to spread
      };
      console.log("Payload sent to initiateStripeDonation API:", backendPayload);
      const response = await apiClient.post<InitiateStripeDonationResponse>(
        '/donations/initiate-stripe-donation',
        backendPayload
      );
      return response.data;
    } catch (error: unknown) {
      console.error('Initiate Stripe donation API error:', error);
      let message = 'Failed to initiate Stripe payment. Please try again.';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.response?.data?.title || error.message || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      throw new Error(message);
    }
  },

  // Your other existing service methods (getAllDonations, etc.) would go here
};

export default DonationService;