// src/WandleWheelhouse.Api/Models/ContactInquiry.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WandleWheelhouse.Api.Models
{
    public class ContactInquiry
    {
        [Key]
        public Guid ContactInquiryId { get; set; }

        [Required]
        public InquiryType Type { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(30)]
        public string? PhoneNumber { get; set; }

        [MaxLength(200)]
        public string? OrganizationName { get; set; } // For tour requests

        [MaxLength(50)]
        public string? TourGroupType { get; set; } // For tour requests (Organization, School, Group, Individual)

        public DateTime? PreferredTourDate { get; set; } // For tour requests

        public int? NumberOfAttendees { get; set; } // For tour requests

        [Required]
        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        public DateTime SubmittedAt { get; set; }

        public bool IsArchived { get; set; } = false; // For admin tracking

        // Optional: Link to User if submitted by a logged-in user
        public string? UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        public ContactInquiry()
        {
            ContactInquiryId = Guid.NewGuid();
            SubmittedAt = DateTime.UtcNow;
        }
    }
}