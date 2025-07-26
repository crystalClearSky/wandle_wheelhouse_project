// src/dto/Donations/StripeDonationDto.ts
export interface InitiateStripeDonationResponse {
  donationId: string;          // GUID as string from the backend
  stripeClientSecret: string;  // Client secret for Stripe payment (e.g., pi_xxx_secret_xxx)
  publishableKey: string;      // Stripe publishable key (e.g., pk_test_xxx)
}