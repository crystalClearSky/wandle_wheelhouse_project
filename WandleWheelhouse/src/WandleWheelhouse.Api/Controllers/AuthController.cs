// Location: src/WandleWheelhouse.Api/Controllers/AuthController.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WandleWheelhouse.Api.DTOs.Auth; // Ensure all DTOs (Register, Login, ForgotPassword, ResetPassword) are here
using WandleWheelhouse.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization; // For [AllowAnonymous]
using Microsoft.AspNetCore.WebUtilities;   // For QueryHelpers (URL encoding/decoding)
using Microsoft.Extensions.Configuration; // For IConfiguration
using Microsoft.Extensions.Logging;       // For ILogger
using WandleWheelhouse.Api.Services;      // For IEmailSender
using Microsoft.AspNetCore.Http;          // For StatusCodes

namespace WandleWheelhouse.Api.Controllers
{
    // BaseApiController likely provides [Route("api/[controller]")] and [ApiController]
    public class AuthController : BaseApiController
    {
        private readonly UserManager<User> _userManager;
        private readonly SignInManager<User> _signInManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailSender _emailSender; // <-- ADDED for password reset

        public AuthController(
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IEmailSender emailSender) // <-- INJECT IEmailSender
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _logger = logger;
            _emailSender = emailSender; // <-- ASSIGN
        }

        [HttpPost("register")]
        [AllowAnonymous] // Ensure registration is accessible to unauthenticated users
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterDto registerDto)
        {
            _logger.LogInformation("Registration attempt for {Email}", registerDto.Email);

            var existingUser = await _userManager.FindByEmailAsync(registerDto.Email);
            if (existingUser != null)
            {
                _logger.LogWarning("Registration failed: Email {Email} already exists.", registerDto.Email);
                return BadRequest(new AuthResponseDto { IsSuccess = false, Message = "Email already exists." });
            }

            var newUser = new User
            {
                FirstName = registerDto.FirstName,
                LastName = registerDto.LastName,
                Email = registerDto.Email,
                UserName = registerDto.Email,
                AddressLine1 = registerDto.AddressLine1,
                AddressLine2 = registerDto.AddressLine2,
                City = registerDto.City,
                PostCode = registerDto.PostCode,
                Country = registerDto.Country,
                EmailConfirmed = true // Consider setting to false and implementing email confirmation flow
            };

            var result = await _userManager.CreateAsync(newUser, registerDto.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                _logger.LogError("Registration failed for {Email}: {Errors}", registerDto.Email, errors);
                return BadRequest(new AuthResponseDto { IsSuccess = false, Message = $"Registration failed: {errors}" });
            }

            // Assign default "Member" role
            string defaultRole = "Member";
            if (!await _roleManager.RoleExistsAsync(defaultRole))
            {
                await _roleManager.CreateAsync(new IdentityRole(defaultRole));
                _logger.LogInformation("Created '{DefaultRole}' role as it did not exist.", defaultRole);
            }
            await _userManager.AddToRoleAsync(newUser, defaultRole);

            _logger.LogInformation("User {Email} registered successfully and assigned '{DefaultRole}' role.", registerDto.Email, defaultRole);
            return Ok(new AuthResponseDto { IsSuccess = true, Message = "User registered successfully. Please log in." });
        }


        [HttpPost("login")]
        [AllowAnonymous] // Ensure login is accessible to unauthenticated users
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status400BadRequest)] // For validation errors
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status401Unauthorized)] // For auth failures
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            _logger.LogInformation("Login attempt for {Email}", loginDto.Email);

            var user = await _userManager.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email && !u.IsDeleted);
            if (user == null)
            {
                _logger.LogWarning("Login failed: User with email {Email} not found or is deleted.", loginDto.Email);
                return Unauthorized(new AuthResponseDto { IsSuccess = false, Message = "Invalid email or password." });
            }

            // Check if email needs to be confirmed for login (if SignIn.RequireConfirmedAccount is true)
            // if (_userManager.Options.SignIn.RequireConfirmedAccount && !await _userManager.IsEmailConfirmedAsync(user))
            // {
            //     _logger.LogWarning("Login failed: Email {Email} not confirmed.", loginDto.Email);
            //     return Unauthorized(new AuthResponseDto { IsSuccess = false, Message = "Email not confirmed." });
            // }

            var result = await _signInManager.PasswordSignInAsync(user, loginDto.Password, isPersistent: false, lockoutOnFailure: true);

            if (!result.Succeeded)
            {
                string failureReason = "Invalid email or password.";
                if (result.IsLockedOut)
                {
                    failureReason = "Account locked out due to too many failed login attempts. Please try again later.";
                    _logger.LogWarning("Login failed: Account {Email} locked out.", loginDto.Email);
                }
                else if (result.IsNotAllowed)
                {
                    failureReason = "Login not allowed for this account (e.g., email not confirmed, or other restriction).";
                    _logger.LogWarning("Login failed: Account {Email} not allowed (IsNotAllowed).", loginDto.Email);
                }
                else
                {
                    _logger.LogWarning("Login failed: Invalid password for {Email}.", loginDto.Email);
                }
                return Unauthorized(new AuthResponseDto { IsSuccess = false, Message = failureReason });
            }

            _logger.LogInformation("User {Email} logged in successfully.", loginDto.Email);
            var tokenDetails = await GenerateJwtToken(user);

            return Ok(new AuthResponseDto
            {
                IsSuccess = true, Message = "Login successful.", Token = tokenDetails.Token,
                TokenExpiration = tokenDetails.Expiration, UserInfo = tokenDetails.UserInfo
            });
        }

        // --- FORGOT PASSWORD ENDPOINT ---
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)] // Always return OK to prevent email enumeration
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto forgotPasswordDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ValidationProblemDetails(ModelState));
            }

            var user = await _userManager.FindByEmailAsync(forgotPasswordDto.Email);
            if (user == null || user.IsDeleted /* || !(await _userManager.IsEmailConfirmedAsync(user)) */ )
            {
                // Don't reveal if the user doesn't exist or isn't confirmed.
                _logger.LogInformation("Password reset requested for email (potential): {Email}. User existence/status not revealed for security.", forgotPasswordDto.Email);
                return Ok(new { message = "If an account with this email address exists and is active, a password reset link will be sent." });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

            // Construct the callback URL
            // This should point to your frontend's reset password page
            var frontendBaseUrl = _configuration["FrontendBaseUrl"]
                ?? _configuration["Jwt:Audience"] // Fallback to JWT Audience if FrontendBaseUrl not set
                ?? "https://yourdomain.com"; // Absolute fallback - CONFIGURE THIS!

            var callbackUrl = $"{frontendBaseUrl.TrimEnd('/')}/reset-password?token={encodedToken}&email={Uri.EscapeDataString(user.Email!)}";

            var emailSubject = "Reset Your Wandle Wheelhouse Password";
            var emailMessage = $@"
                <p>Hello {user.FirstName ?? "User"},</p>
                <p>You recently requested to reset your password for your Wandle Wheelhouse account.</p>
                <p>Please click the link below to set a new password:</p>
                <p><a href='{callbackUrl}'>Reset Password</a></p>
                <p>If you did not request a password reset, please ignore this email or contact us if you have concerns.</p>
                <p>This link will expire according to the token lifespan configured in ASP.NET Core Identity (typically 1 hour by default).</p>
                <p>Thank you,<br/>The Wandle Wheelhouse Team</p>
            ";

            try
            {
                await _emailSender.SendEmailAsync(forgotPasswordDto.Email, emailSubject, emailMessage);
                _logger.LogInformation("Password reset link processed for {Email}. If user exists, email was dispatched. Callback URL (logged for dev): {CallbackUrl}", forgotPasswordDto.Email, callbackUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset email to {Email}.", forgotPasswordDto.Email);
                // Still return OK to the user to not reveal email existence or email system issues.
            }
            
            return Ok(new { message = "If an account with this email address exists and is active, a password reset link will be sent." });
        }

        // --- RESET PASSWORD ENDPOINT ---
        [HttpPost("reset-password")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto resetPasswordDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ValidationProblemDetails(ModelState));
            }

            var user = await _userManager.FindByEmailAsync(resetPasswordDto.Email);
            if (user == null || user.IsDeleted)
            {
                _logger.LogWarning("Password reset attempt for non-existent, deleted, or unconfirmed email: {Email}", resetPasswordDto.Email);
                // Don't reveal that the user does not exist or specific status
                return BadRequest(new ProblemDetails { Title = "Password reset failed.", Detail = "Invalid token, email, or password complexity." });
            }

            try
            {
                var decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(resetPasswordDto.Token));
                var result = await _userManager.ResetPasswordAsync(user, decodedToken, resetPasswordDto.NewPassword);

                if (result.Succeeded)
                {
                    _logger.LogInformation("Password successfully reset for user {Email}", resetPasswordDto.Email);
                    // Optional: Log user out of all other sessions by updating SecurityStamp
                    // await _userManager.UpdateSecurityStampAsync(user);
                    return Ok(new { message = "Your password has been reset successfully. You can now log in with your new password." });
                }

                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                _logger.LogWarning("Password reset failed for user {Email}. Errors: {Errors}", resetPasswordDto.Email, errors);
                // Provide a generic error message to the client
                return BadRequest(new ProblemDetails { Title = "Password reset failed.", Detail = "Invalid token, or new password does not meet complexity requirements." });
            }
            catch (FormatException ex) // Catch Base64UrlDecode errors for invalid tokens
            {
                _logger.LogWarning(ex, "Invalid token format during password reset for email: {Email}", resetPasswordDto.Email);
                return BadRequest(new ProblemDetails { Title = "Password reset failed.", Detail = "Invalid token format." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during password reset for email: {Email}", resetPasswordDto.Email);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An unexpected error occurred."});
            }
        }


        // --- Helper Method to Generate JWT ---
        private async Task<(string Token, DateTime Expiration, UserInfoDto UserInfo)> GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]!); // Null-forgiving assuming validated at startup

            var roles = await _userManager.GetRolesAsync(user);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email!),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.GivenName, user.FirstName),
                new Claim(ClaimTypes.Surname, user.LastName)
            };

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var expires = DateTime.UtcNow.AddHours(Convert.ToDouble(jwtSettings["HoursToExpire"] ?? "1"));
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expires,
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwtToken = tokenHandler.WriteToken(token);

            var userInfo = new UserInfoDto
            {
                UserId = user.Id, Email = user.Email!, FirstName = user.FirstName,
                LastName = user.LastName, Roles = roles, AvatarUrl = user.AvatarUrl
            };

            return (jwtToken, token.ValidTo, userInfo);
        }
    }
}