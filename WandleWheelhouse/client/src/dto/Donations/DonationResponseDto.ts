// src/dto/Donations/DonationResponseDto.ts
import { PaymentMethod } from './PaymentMethodEnum';
import { PaymentStatus } from './PaymentStatusEnum';

// Matches backend DTO for the response after donation attempt or when fetching donations
export interface DonationResponseDto {
  donationId: string; // GUID as string
  amount: number;
  currency?: string | null;        // NEW: Currency used for the donation
  method: PaymentMethod;
  status: PaymentStatus;
  donationDate: string;            // ISO Date string

  transactionId?: string | null;   // Original transaction ID (e.g., Worldpay, PayPal)
                                   // For Stripe, this might store the Charge ID or be redundant if PaymentIntentId is used.

  paymentIntentId?: string | null; // NEW: Stripe's Payment Intent ID
  stripeActualPaymentStatus?: string | null; // NEW: Raw status from Stripe for detailed info

  // StripeClientSecret is NOT typically included in general GET responses for security.
  // It's returned once by the /initiate-stripe-donation endpoint.
  // stripeClientSecret?: string | null;

  // Information about the donor
  userId?: string | null;
  userFullName?: string | null;
  donorFirstName?: string | null;    // Populated by backend's MapToDto
  donorLastName?: string | null;     // Populated by backend's MapToDto
  donorEmail?: string | null;        // Populated by backend's MapToDto

  // Existing fields
  isRecurring: boolean;
  subscriptionId?: string | null;
}