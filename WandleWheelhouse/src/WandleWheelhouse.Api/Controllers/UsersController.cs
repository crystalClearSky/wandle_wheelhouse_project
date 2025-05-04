using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting; // Required for IWebHostEnvironment
using Microsoft.AspNetCore.Http;   // Required for IFormFile, StatusCodes
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging; // Required for ILogger
using System;                      // Required for Guid, Exception, StringComparison
using System.Collections.Generic;  // Required for IList, List, HashSet
using System.IO;                   // Required for Path, FileStream, Directory, File
using System.Linq;                 // Required for Linq Select
using System.Security.Claims;      // Required for ClaimTypes
using System.Threading.Tasks;      // Required for Task, Task<T>
using WandleWheelhouse.Api.Controllers; // For BaseApiController if in different namespace
using WandleWheelhouse.Api.DTOs.Users; // Required for UserDetailDto
using WandleWheelhouse.Api.Models;     // Required for User
using WandleWheelhouse.Api.Services; // Required for IEmailSender

namespace WandleWheelhouse.Api.Controllers
{
    [Authorize] // All actions in this controller require authentication
    public class UsersController : BaseApiController
    {
        private readonly UserManager<User> _userManager;
        private readonly IEmailSender _emailSender; // Needed for delete notification
        private readonly ILogger<UsersController> _logger;
        private readonly IWebHostEnvironment _environment; // Needed for file paths
        private readonly IConfiguration _configuration; // Needed for admin contact email

        public UsersController(
            UserManager<User> userManager,
            IEmailSender emailSender, // Keep if used in DeleteMyAccount
            ILogger<UsersController> logger,
            IWebHostEnvironment environment,
            IConfiguration configuration) // Inject configuration
        {
            _userManager = userManager;
            _emailSender = emailSender;
            _logger = logger;
            _environment = environment;
            _configuration = configuration; // Assign configuration
        }

        // --- Endpoint for Self-Service Account Deletion (Soft Delete) ---
        [HttpDelete("me/delete-account")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteMyAccount()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // No explicit null check needed for userId due to [Authorize]

            var user = await _userManager.FindByIdAsync(userId!); // Use null-forgiving operator
            if (user == null || user.IsDeleted)
            {
                 _logger.LogWarning("DeleteMyAccount failed: User {UserId} not found or already deleted.", userId);
                return NotFound("User not found.");
            }

            // Store original email before anonymizing it
            string originalEmail = user.Email ?? "User";

            _logger.LogInformation("User {UserId} requesting account deletion.", userId);

            // --- Perform Soft Delete ---
            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            // Anonymize potentially unique fields to allow re-registration later
            user.UserName = $"deleted_{user.Id}_{Guid.NewGuid().ToString("N").Substring(0, 8)}";
            user.NormalizedUserName = user.UserName.ToUpperInvariant();
            user.Email = $"deleted_{user.Id}@example.com"; // Anonymize email
            user.NormalizedEmail = user.Email.ToUpperInvariant();
            user.PasswordHash = null; // Remove password hash
            user.SecurityStamp = Guid.NewGuid().ToString(); // Invalidate existing tokens/sessions
            user.AvatarUrl = null; // Clear avatar URL (optional: delete file too later)
            user.EmailConfirmed = false; // Mark email as unconfirmed

            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                _logger.LogError("Failed to soft delete User ID {UserId}: {Errors}", userId, errors);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete account.");
            }

            // --- Send Notification Email ---
            try {
                await _emailSender.SendEmailAsync(
                    originalEmail, // Send to their actual email
                    "Wandle Wheelhouse Account Deletion Confirmation",
                    $"<p>Your account with Wandle Wheelhouse has been marked for deletion.</p><p>Your personal details will be retained for 30 days in case you wish to reactivate your account during this period. After 30 days, your data will be permanently removed.</p><p>If you did not request this, please contact support immediately.</p>"
                );
                 _logger.LogInformation("Sent account deletion notification to {Email} for User {UserId}", originalEmail, userId);
            } catch (Exception emailEx) {
                _logger.LogError(emailEx, "Failed to send account deletion email to {Email} for User {UserId}", originalEmail, userId);
                // Don't fail the request if email fails, but log it.
            }

             _logger.LogInformation("User {UserId} account soft deleted successfully.", userId);
            return NoContent(); // Success
        }


        // --- Endpoint to Upload/Update Avatar ---
        [HttpPost("me/avatar")]
        [Consumes("multipart/form-data")] // Explicitly state content type
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)] // Return object with new URL
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // No explicit null check needed for userId due to [Authorize]

            var user = await _userManager.FindByIdAsync(userId!); // Use null-forgiving operator
            if (user == null || user.IsDeleted)
            {
                _logger.LogWarning("UploadAvatar failed: User {UserId} not found or deleted.", userId);
                return NotFound("User not found.");
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new ProblemDetails { Title = "No file uploaded." });
            }

            // File Validation
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            {
                return BadRequest(new ProblemDetails { Title = "Invalid file type. Only JPG, JPEG, PNG, GIF are allowed." });
            }
            long maxFileSize = 5 * 1024 * 1024; // 5 MB
            if (file.Length > maxFileSize)
            {
                 return BadRequest(new ProblemDetails { Title = $"File size exceeds the limit of {maxFileSize / 1024 / 1024} MB." });
            }

            // File Saving
            var storageFolder = Path.Combine("uploads", "avatars");
            var webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
            var relativeFolderPath = Path.Combine(webRootPath, storageFolder);

            try
            {
                if (!Directory.Exists(relativeFolderPath)) Directory.CreateDirectory(relativeFolderPath);

                var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                var absoluteFilePath = Path.Combine(relativeFolderPath, uniqueFileName);

                // Delete old file if exists
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    var oldFileName = Path.GetFileName(user.AvatarUrl);
                    var oldAbsoluteFilePath = Path.Combine(relativeFolderPath, oldFileName);
                    if (System.IO.File.Exists(oldAbsoluteFilePath)) {
                       try { System.IO.File.Delete(oldAbsoluteFilePath); } catch (Exception ex) { _logger.LogWarning(ex, "Could not delete old avatar: {File}", oldAbsoluteFilePath); }
                    }
                }

                // Save new file
                using (var stream = new FileStream(absoluteFilePath, FileMode.Create)) {
                    await file.CopyToAsync(stream);
                }

                // Update Database
                var relativeUrlPath = $"/{storageFolder.Replace("\\", "/")}/{uniqueFileName}";
                user.AvatarUrl = relativeUrlPath;
                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded) {
                    try { System.IO.File.Delete(absoluteFilePath); } catch { /* Log maybe */ } // Rollback file save
                    var errors = string.Join("; ", updateResult.Errors.Select(e => e.Description));
                    _logger.LogError("Failed to update user avatar URL for {UserId}: {Errors}", userId, errors);
                    return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "Failed to update user profile." });
                }

                _logger.LogInformation("User {UserId} avatar URL updated to: {AvatarUrl}", userId, user.AvatarUrl);
                return Ok(new { avatarUrl = user.AvatarUrl }); // Return new relative URL

            } catch (Exception ex) {
                _logger.LogError(ex, "An error occurred while uploading avatar for user {UserId}.", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An error occurred saving the image file." });
            }
        }


        // --- Endpoint to verify token and get current user's profile ---
        [HttpGet("me/profile")]
        [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // No need for null check on userId here, [Authorize] ensures it exists.

            var user = await _userManager.FindByIdAsync(userId!);
            if (user == null || user.IsDeleted)
            {
                 _logger.LogWarning("GetMyProfile failed: User {UserId} not found or deleted.", userId);
                return NotFound("User not found.");
            }

            var roles = await _userManager.GetRolesAsync(user);
            var dto = MapToUserDetailDto(user, roles); // Use helper
            return Ok(dto);
        }


        // --- Helper Method to Map User Entity to DTO ---
        // (Copied/adapted from AdminController - consider moving to a shared service/mapper)
        private UserDetailDto MapToUserDetailDto(User user, IList<string> roles)
        {
            // Ensure DTO namespace is imported: using WandleWheelhouse.Api.DTOs.Users;
            return new UserDetailDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                EmailConfirmed = user.EmailConfirmed,
                LockoutEnabled = user.LockoutEnabled,
                LockoutEnd = user.LockoutEnd,
                AddressLine1 = user.AddressLine1,
                AddressLine2 = user.AddressLine2,
                City = user.City,
                PostCode = user.PostCode,
                Country = user.Country,
                AvatarUrl = user.AvatarUrl, // Include AvatarUrl
                Roles = roles ?? new List<string>()

                // public string? AvatarUrl { get; set; }
            };
        }
    }
}