// Matches backend enum
export enum SubscriptionStatus {
    Active = 0,
    Cancelled = 1,
    Paused = 2, // Keep if defined in backend, otherwise remove
    PaymentFailed = 3,
    CancellationPending = 4, // Added status
  }
