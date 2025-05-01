using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WandleWheelhouse.Api.Models;

#nullable enable

public enum SubscriptionStatus
{
    Active,
    Cancelled,
    Paused, // Optional
    PaymentFailed,
    CancellationPending // New status
}

public class Subscription
{
    [Key]
    public Guid SubscriptionId { get; set; } = Guid.NewGuid();

    [Required]
    [ForeignKey("User")]
    public string UserId { get; set; } = null!; // Non-nullable foreign key
    public virtual User User { get; set; } = null!;

    [Required]
    [Column(TypeName = "decimal(18, 2)")]
    // Consider specific allowed values (£5, £10, £15...) using validation later
    public decimal MonthlyAmount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; } // Initial method used

    [Required]
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? CancellationDate { get; set; }
    public DateTime? NextPaymentDate { get; set; } // Important for scheduling

    // Payment provider specific details
    public string? ProviderSubscriptionId { get; set; } // E.g., PayPal Subscription ID
    public string? LastTransactionId { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CancellationRequestedDate { get; set; } // When user hit cancel
}
#nullable disable