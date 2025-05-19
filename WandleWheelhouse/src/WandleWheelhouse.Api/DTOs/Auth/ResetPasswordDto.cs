// src/WandleWheelhouse.Api/DTOs/Auth/ResetPasswordDto.cs
using System.ComponentModel.DataAnnotations;

namespace WandleWheelhouse.Api.DTOs.Auth
{
    public class ResetPasswordDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty; // The password reset token

        [Required]
                [DataType(DataType.Password)]
[StringLength(100, ErrorMessage = "The {0} must be at least {2} and at max {1} characters long.", MinimumLength = 8)]
// Consider adding Regex for password complexity if not relying solely on Identity options
public string NewPassword { get; set; } = string.Empty;

        [DataType(DataType.Password)]
        [Display(Name = "Confirm new password")]
        [Compare("NewPassword", ErrorMessage = "The new password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}