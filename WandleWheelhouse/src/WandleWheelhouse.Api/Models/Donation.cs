// Location: src/WandleWheelhouse.Api/Models/Donation.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WandleWheelhouse.Api.Models;

#nullable enable

public enum PaymentMethod
{
    Worldpay,
    PayPal,
    Stripe // Your existing enum with Stripe
}

public enum PaymentStatus
{
    Pending,
    Success,
    Failed,
    Refunded // Your existing enum
}

public class Donation
{
    [Key]
    public Guid DonationId { get; set; } = Guid.NewGuid();

    [Required]
    [Column(TypeName = "decimal(18, 2)")]
    public decimal Amount { get; set; }

    /// <summary>
    /// The currency code for the Amount (e.g., "gbp", "usd").
    /// </summary>
    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "gbp"; // Default to GBP, ensure it's set

    [Required]
    public PaymentMethod Method { get; set; }

    [Required]
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    [Required]
    public DateTime DonationDate { get; set; } = DateTime.UtcNow;

    public string? UserId { get; set; }
    public virtual User? User { get; set; }

    public string? DonorFirstName { get; set; }
    public string? DonorLastName { get; set; }
    public string? DonorEmail { get; set; }

    public string? TransactionId { get; set; }
    public string? PaymentIntentId { get; set; } // Stripe's Payment Intent ID

    [NotMapped]
    public string? StripeClientSecret { get; set; } // For client-side, not saved to DB

    public string? StripeActualPaymentStatus { get; set; } // Raw status from Stripe

    // Billing Address Fields (nullable)
    public string? BillingAddressLine1 { get; set; }
    public string? BillingAddressLine2 { get; set; }
    public string? BillingCity { get; set; }
    public string? BillingStateOrCounty { get; set; } // Or just "State" or "County"
    public string? BillingPostCode { get; set; }
    public string? BillingCountry { get; set; } // Typically a 2-letter ISO code, e.g., "GB", "US"

    [Required]
    public bool IsRecurring { get; set; } = false;

    public Guid? SubscriptionId { get; set; }
    [ForeignKey("SubscriptionId")]
    public virtual Subscription? Subscription { get; set; }



    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
#nullable disable