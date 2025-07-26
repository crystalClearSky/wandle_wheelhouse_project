// Location: src/WandleWheelhouse.Api/DTOs/Donations/DonationRequestDto.cs

using System;
using System.ComponentModel.DataAnnotations;
using WandleWheelhouse.Api.Models; // Required to reference your PaymentMethod enum

namespace WandleWheelhouse.Api.DTOs.Donations
{
#nullable enable
    public class DonationRequestDto
    {
        [Required]
        [Range(1.00, 10000.00, ErrorMessage = "Donation amount must be between £1.00 and £10,000.00")]
        public decimal Amount { get; set; }

        /// <summary>
        /// The currency of the donation amount (e.g., "gbp", "usd").
        /// This will be used by Stripe. If not provided, a default will be used (e.g., "gbp").
        /// </summary>
        [MaxLength(3, ErrorMessage = "Currency code should be 3 characters, e.g., GBP.")]
        public string? Currency { get; set; } // Added for Stripe flexibility

        // This field is part of your existing DTO.
        // For the '/initiate-stripe-donation' endpoint, the API will set the method to Stripe internally.
        // For the '/process' endpoint, the client would send Worldpay or PayPal.
        [Required]
        public PaymentMethod Method { get; set; }

        // Optional: For anonymous donations or to prefill if user is not logged in
        [MaxLength(100)]
        public string? DonorFirstName { get; set; }

        [MaxLength(100)]
        public string? DonorLastName { get; set; }

        [EmailAddress]
        [MaxLength(256)]
        public string? DonorEmail { get; set; } // Important for receipts, especially for anonymous donations
           // Billing Address Fields (nullable)
    [MaxLength(200)]
    public string? BillingAddressLine1 { get; set; }
    [MaxLength(200)]
    public string? BillingAddressLine2 { get; set; }
    [MaxLength(100)]
    public string? BillingCity { get; set; }
    [MaxLength(100)]
    public string? BillingStateOrCounty { get; set; }
    [MaxLength(20)] // Adjust max length as appropriate for postcodes
    public string? BillingPostCode { get; set; }
    [MaxLength(2)] // For 2-letter ISO country codes
    public string? BillingCountry { get; set; }

        // These fields were marked "--- ADD THESE PROPERTIES ---" in your request.
        // For a one-time donation request via Stripe, 'IsRecurring' would typically be false
        // and 'SubscriptionId' would be null.
        // If this DTO is ONLY for initiating a new one-time donation, these might not be strictly needed here.
        // However, if it's a general DTO, they can remain.
        // For the 'initiate-stripe-donation' endpoint, the controller will set IsRecurring = false.
        public bool IsRecurring { get; set; } = false; // Default to false for a typical donation request
        public Guid? SubscriptionId { get; set; }     // Will be null for one-time donations
    }
#nullable disable
}