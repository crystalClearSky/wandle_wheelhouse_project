using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
// src/WandleWheelhouse.Api/DTOs/Auth/ForgotPasswordDto.cs
using System.ComponentModel.DataAnnotations;

namespace WandleWheelhouse.Api.DTOs.Auth
{
    public class ForgotPasswordDto
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Invalid email address format.")]
        public string Email { get; set; } = string.Empty;
    }
}