// src/dto/Subscriptions/SubscriptionRequestDto.ts
import { PaymentMethod } from '../Donations/PaymentMethodEnum'; // Reuse enum

// Matches backend DTO for creating a subscription
export interface SubscriptionRequestDto {
  monthlyAmount: number; // The selected amount (£5, 10, ... 100)
  method: PaymentMethod;
}