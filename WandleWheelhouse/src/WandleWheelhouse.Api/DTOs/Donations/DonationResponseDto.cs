using System;
using System.Collections.Generic;
using System.Linq;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.DTOs.Donations;

#nullable enable
public class DonationResponseDto
{
    public Guid DonationId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; }
    public DateTime DonationDate { get; set; }
    public string? TransactionId { get; set; } // Payment provider's transaction ID

    // Information about the donor
    public string? UserId { get; set; } // Included if made by a logged-in user
    public string? UserFullName { get; set; } // e.g., "John Doe" if logged in
    public string? DonorFirstName { get; set; } // Included if anonymous
    public string? DonorLastName { get; set; }  // Included if anonymous
    public string? DonorEmail { get; set; }     // Included always (user email or anonymous email)
}
#nullable disable