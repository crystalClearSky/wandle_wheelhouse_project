import { PaymentMethod } from "./PaymentMethodEnum";

export interface DonationRequestDto {
  amount: number;
  method: PaymentMethod;
  currency?: string | null; // Keep this from previous updates

  donorFirstName?: string | null;
  donorLastName?: string | null;
  donorEmail?: string | null;

  // Billing Address Fields (optional)
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingStateOrCounty?: string | null;
  billingPostCode?: string | null;
  billingCountry?: string | null; // Should be 2-letter ISO code for Stripe

  isRecurring: boolean;
  subscriptionId?: string | null;
}