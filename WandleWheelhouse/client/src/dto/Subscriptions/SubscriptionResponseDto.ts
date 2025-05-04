import { PaymentMethod } from '../Donations/PaymentMethodEnum'; // Reuse enum
import { SubscriptionStatus } from './SubscriptionStatusEnum';

// Matches backend DTO for displaying subscription details
export interface SubscriptionResponseDto {
  subscriptionId: string; // GUID as string
  monthlyAmount: number;
  method: PaymentMethod;
  status: SubscriptionStatus;
  startDate: string; // ISO Date string
  nextPaymentDate?: string | null; // ISO Date string or null
  cancellationDate?: string | null; // ISO Date string or null (Now indicates when it WILL be cancelled if pending)
  providerSubscriptionId?: string | null;

  // User Info (Included from backend if needed, e.g., for Admin view)
  userId: string;
  userFullName?: string | null;
}