// DTO for subscribing to the newsletter
export interface NewsletterSubscriptionRequestDto {
  email: string;
}

// Mirrors backend DTO used for listing newsletter subscriptions
export interface NewsletterSubscriptionResponseDto {
  newsletterSubscriptionId: string; // Assuming GUID as string
  email: string;
  subscriptionDate: string; // ISO Date string
  userId?: string | null; // Optional UserId
}