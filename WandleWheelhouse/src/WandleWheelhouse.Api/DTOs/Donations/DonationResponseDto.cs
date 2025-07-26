// Location: src/WandleWheelhouse.Api/DTOs/Donations/DonationResponseDto.cs

using System;
using System.ComponentModel.DataAnnotations; // For Required, Range attributes if you choose to use them here
using WandleWheelhouse.Api.Models; // Essential to access your PaymentMethod and PaymentStatus enums

namespace WandleWheelhouse.Api.DTOs.Donations
{
#nullable enable
    public class DonationResponseDto
    {
        public Guid DonationId { get; set; }

        [Required] // Keep if you want to validate even on response, though less common
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0.")]
        public decimal Amount { get; set; }

        /// <summary>
        /// The currency of the donation (e.g., "gbp", "usd").
        /// This was added to DonationRequestDto and should be reflected here if the Donation model stores it.
        /// Assuming your Donation model will now have a Currency property.
        /// </summary>
        public string? Currency { get; set; } // Matches the Currency property in Donation model

        [Required] // Assuming Method is always required in a response
        public PaymentMethod Method { get; set; } // Uses your WandleWheelhouse.Api.Models.PaymentMethod

        [Required] // Assuming Status is always required in a response
        public PaymentStatus Status { get; set; } // Uses your WandleWheelhouse.Api.Models.PaymentStatus

        public DateTime DonationDate { get; set; }

        /// <summary>
        /// Original transaction ID from a payment provider (e.g., Worldpay, PayPal).
        /// For Stripe, this might be redundant if PaymentIntentId is used, or could store Charge ID if applicable.
        /// </summary>
        public string? TransactionId { get; set; }

        /// <summary>
        /// Stripe's Payment Intent ID (e.g., "pi_xxxxxxxxxxxx").
        /// Relevant if the payment method was Stripe.
        /// </summary>
        public string? PaymentIntentId { get; set; } // NEW: From your Donation model

        /// <summary>
        /// The actual status from Stripe (e.g., "succeeded", "requires_payment_method").
        /// Useful for detailed status information, especially for Stripe payments.
        /// </summary>
        public string? StripeActualPaymentStatus { get; set; } // NEW: From your Donation model

        // StripeClientSecret is highly sensitive and typically NOT included in general-purpose response DTOs,
        // especially for list/get operations. It's usually only returned immediately after creating a PaymentIntent
        // for the client to use once. If you absolutely need it in some specific response scenario, add it,
        // but be very cautious. For a general DonationResponseDto, it's better to omit it.
        // public string? StripeClientSecret { get; set; } // OMITTED FOR SECURITY unless specifically needed for a particular response context

        // Information about the donor
        public string? UserId { get; set; }
        public string? UserFullName { get; set; }
        public string? DonorFirstName { get; set; } // Should be based on MapToDto logic
        public string? DonorLastName { get; set; }  // Should be based on MapToDto logic
        public string? DonorEmail { get; set; }
            // Billing Address Fields
    public string? BillingAddressLine1 { get; set; }
    public string? BillingAddressLine2 { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingStateOrCounty { get; set; }
    public string? BillingPostCode { get; set; }
    public string? BillingCountry { get; set; }

        // --- Properties from your existing DTO, confirmed relevant ---
        public bool IsRecurring { get; set; }
        public Guid? SubscriptionId { get; set; }
    }
#nullable disable
}