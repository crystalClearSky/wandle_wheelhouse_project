// src/WandleWheelhouse.Api/DTOs/ContactInquiries/ContactInquiryRequestDto.cs
using System.ComponentModel.DataAnnotations;
using WandleWheelhouse.Api.Models; // For InquiryType enum

namespace WandleWheelhouse.Api.DTOs.ContactInquiries
{
    #nullable enable
    public class ContactInquiryRequestDto
    {
        [Required(ErrorMessage = "Please select the type of your inquiry.")]
        public string InquiryType { get; set; } = string.Empty; // Will be "GeneralInquiry", "Volunteering", etc.

        [Required(ErrorMessage = "Please enter your name.")]
        [MaxLength(150, ErrorMessage = "Name cannot exceed 150 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Please enter your email address.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [MaxLength(256, ErrorMessage = "Email cannot exceed 256 characters.")]
        public string Email { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Please enter a valid phone number.")] // Basic validation
        [MaxLength(30, ErrorMessage = "Phone number cannot exceed 30 characters.")]
        public string? PhoneNumber { get; set; }

        [Required(ErrorMessage = "Please enter your message.")]
        [MinLength(10, ErrorMessage = "Message must be at least 10 characters long.")]
        [MaxLength(2000, ErrorMessage = "Message cannot exceed 2000 characters.")]
        public string Message { get; set; } = string.Empty;

        // Conditional fields for Tour Requests
        // These will be validated by the frontend logic or can have conditional validation here if complex
        [MaxLength(200, ErrorMessage = "Organization name cannot exceed 200 characters.")]
        public string? OrganizationName { get; set; }

        [MaxLength(50, ErrorMessage = "Group type cannot exceed 50 characters.")]
        public string? TourGroupType { get; set; } // "Organization", "School", "Group", "Individual"

        public DateTime? PreferredTourDate { get; set; } // Validate if it's a future date if provided

        [Range(1, 200, ErrorMessage = "Number of attendees must be between 1 and 200.")] // Example range
        public int? NumberOfAttendees { get; set; }

        [Required(ErrorMessage = "You must consent to being contacted.")]
        [Range(typeof(bool), "true", "true", ErrorMessage = "You must consent to being contacted.")]
        public bool HasConsented { get; set; } // For GDPR consent checkbox
    }
    #nullable disable
}