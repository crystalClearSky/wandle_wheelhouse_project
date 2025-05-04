import { PaymentMethod } from './PaymentMethodEnum';

// Matches backend DTO for making a donation
export interface DonationRequestDto {
  amount: number; // Use number for frontend state
  method: PaymentMethod;

  // Optional fields for anonymous donations
  donorFirstName?: string | null;
  donorLastName?: string | null;
  donorEmail?: string | null;
}