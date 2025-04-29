using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

    namespace WandleWheelhouse.Api.Models;

    #nullable enable

    public enum PaymentMethod
    {
        Worldpay,
        PayPal
    }

    public enum PaymentStatus
    {
        Pending,
        Success,
        Failed,
        Refunded
    }

    public class Donation
    {
        [Key]
        public Guid DonationId { get; set; } = Guid.NewGuid();

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        [Required]
        public PaymentMethod Method { get; set; }

        [Required]
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        [Required]
        public DateTime DonationDate { get; set; } = DateTime.UtcNow;

        // Foreign Key to User (if donation is made by a logged-in user)
        public string? UserId { get; set; }
        public virtual User? User { get; set; }

        // Information for anonymous donations (if User is null)
        public string? DonorFirstName { get; set; }
        public string? DonorLastName { get; set; }
        public string? DonorEmail { get; set; } // Important for receipts

        // Payment Provider specific details (store transaction IDs, etc.)
        public string? TransactionId { get; set; } // ID from Worldpay/PayPal
        public string? PaymentIntentId { get; set; } // E.g., Stripe's Payment Intent ID

        // Audit fields
         public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
         public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
    #nullable disable