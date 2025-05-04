using System;
using System.Collections.Generic; // Required for IList

namespace WandleWheelhouse.Api.DTOs.Users // Ensure namespace matches your structure
{
    #nullable enable // Enable nullable context for optional strings
    public class UserDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool LockoutEnabled { get; set; }
        public DateTimeOffset? LockoutEnd { get; set; }

        // Address fields
        public string? AddressLine1 { get; set; }
        public string? AddressLine2 { get; set; }
        public string? City { get; set; }
        public string? PostCode { get; set; }
        public string? Country { get; set; }

        // Assigned Roles
        public IList<string> Roles { get; set; } = new List<string>();

        // --- ADD THIS PROPERTY ---
        public string? AvatarUrl { get; set; }
        // --- END ADD ---
    }
    #nullable disable // Disable nullable context if needed elsewhere
}