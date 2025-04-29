using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using WandleWheelhouse.Api.Models; // To access PaymentMethod enum

namespace WandleWheelhouse.Api.DTOs.Donations;

#nullable enable
public class DonationRequestDto
{
    [Required]
    [Range(1.00, 10000.00, ErrorMessage = "Donation amount must be between £1.00 and £10,000.00")] // Example range
    public decimal Amount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; } // Worldpay or PayPal

    // Optional: For anonymous donations
    [MaxLength(100)]
    public string? DonorFirstName { get; set; }

    [MaxLength(100)]
    public string? DonorLastName { get; set; }

    [EmailAddress]
    [MaxLength(256)]
    public string? DonorEmail { get; set; } // Required if anonymous for receipt? Decide policy.
}
#nullable disable