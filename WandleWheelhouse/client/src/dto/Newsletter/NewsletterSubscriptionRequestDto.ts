// src/dto/Newsletter/NewsletterSubscriptionRequestDto.ts
// Matches backend DTO for subscribing

  // Mirrors backend DTO used for listing newsletter subscriptions
export interface NewsletterSubscriptionResponseDto {
  newsletterSubscriptionId: string; // Assuming GUID as string
  email: string;
  subscriptionDate: string; // ISO Date string
  userId?: string | null; // Optional UserId
}