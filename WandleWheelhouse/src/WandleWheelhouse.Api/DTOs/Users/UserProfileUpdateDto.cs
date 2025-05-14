// Location: src/WandleWheelhouse.Api/DTOs/Users/UserProfileUpdateDto.cs
using System.ComponentModel.DataAnnotations;

namespace WandleWheelhouse.Api.DTOs.Users
{
#nullable enable // Enable nullable context for optional string properties
    public class UserProfileUpdateDto
    {
        [Required(AllowEmptyStrings = false, ErrorMessage = "First name is required.")]
        [StringLength(100, ErrorMessage = "First name cannot exceed 100 characters.")]
        public string? FirstName { get; set; }

        [Required(AllowEmptyStrings = false, ErrorMessage = "Last name is required.")]
        [StringLength(100, ErrorMessage = "Last name cannot exceed 100 characters.")]
        public string? LastName { get; set; }

        // Address fields are optional.
        // Frontend should send null or empty string if user clears them.
        [StringLength(200, ErrorMessage = "Address Line 1 cannot exceed 200 characters.")]
        public string? AddressLine1 { get; set; }

        [StringLength(200, ErrorMessage = "Address Line 2 cannot exceed 200 characters.")]
        public string? AddressLine2 { get; set; }

        [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
        public string? City { get; set; }

        [StringLength(20, ErrorMessage = "Post code cannot exceed 20 characters.")]
        public string? PostCode { get; set; }

        [StringLength(100, ErrorMessage = "Country cannot exceed 100 characters.")]
        public string? Country { get; set; }

        // Note: We are intentionally NOT including fields like Email or PhoneNumber here.
        // Changes to those usually require a separate verification/confirmation process
        // (e.g., sending a confirmation link to the new email).
        // Password changes are also handled by dedicated Identity endpoints.
    }
#nullable disable
}