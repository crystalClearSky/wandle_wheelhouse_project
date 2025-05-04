using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace WandleWheelhouse.Api.Models;

#nullable enable // Enable nullable reference types checking

public class User : IdentityUser
{
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    // Inherits Email, PasswordHash, PhoneNumber etc. from IdentityUser
    // We can add custom fields like Address if needed:
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? PostCode { get; set; }
    public string? Country { get; set; }

    // Navigation Properties (Relationships)
    public virtual ICollection<Donation>? Donations { get; set; }
    public virtual ICollection<Subscription>? Subscriptions { get; set; }
    // Add these for Soft Delete
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    // --- Add Avatar URL field ---
    [MaxLength(2048)] // Max URL length
    public string? AvatarUrl { get; set; }
}
#nullable disable // Disable nullable checking if needed elsewhere