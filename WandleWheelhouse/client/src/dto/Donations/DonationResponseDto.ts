import { PaymentMethod } from './PaymentMethodEnum';
import { PaymentStatus } from './PaymentStatusEnum';

// Matches backend DTO for the response after donation attempt
export interface DonationResponseDto {
  donationId: string; // GUID as string
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  donationDate: string; // ISO Date string
  transactionId?: string | null;

  // Donor info
  userId?: string | null;
  userFullName?: string | null; // Sent if userId is present
  donorFirstName?: string | null; // Sent if anonymous
  donorLastName?: string | null;  // Sent if anonymous
  donorEmail?: string | null;     // Email (user's or anonymous)
}