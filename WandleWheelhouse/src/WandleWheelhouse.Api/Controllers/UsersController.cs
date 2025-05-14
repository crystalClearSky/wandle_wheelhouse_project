// Location: src/WandleWheelhouse.Api/Controllers/UsersController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;    // Required for IWebHostEnvironment
using Microsoft.AspNetCore.Http;      // Required for IFormFile, StatusCodes
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration; // Required for IConfiguration
using Microsoft.Extensions.Logging;   // Required for ILogger
using System;                         // Required for Guid, Exception, StringComparison
using System.Collections.Generic;     // Required for IList, List
using System.IO;                      // Required for Path, FileStream, Directory, File
using System.Linq;                    // Required for Linq Select
using System.Security.Claims;         // Required for ClaimTypes
using System.Threading.Tasks;         // Required for Task, Task<T>
using WandleWheelhouse.Api.DTOs.Users; // Required for UserDetailDto, UserProfileUpdateDto
using WandleWheelhouse.Api.Models;     // Required for User
using WandleWheelhouse.Api.Services;   // Required for IEmailSender

namespace WandleWheelhouse.Api.Controllers
{
    [Authorize] // All actions in this controller require authentication by default
    public class UsersController : BaseApiController // Assuming BaseApiController provides [Route("api/[controller]")] and [ApiController]
    {
        private readonly UserManager<User> _userManager;
        private readonly IEmailSender _emailSender;
        private readonly ILogger<UsersController> _logger;
        private readonly IWebHostEnvironment _environment; // For file paths
        private readonly IConfiguration _configuration; // For things like admin email if needed

        public UsersController(
            UserManager<User> userManager,
            IEmailSender emailSender,
            ILogger<UsersController> logger,
            IWebHostEnvironment environment,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _emailSender = emailSender;
            _logger = logger;
            _environment = environment;
            _configuration = configuration;
        }

        // --- Endpoint to verify token and get current user's profile ---
        [HttpGet("me/profile")]
        [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // [Authorize] ensures userId is present, so null-forgiving operator ! is generally safe here.
            var user = await _userManager.FindByIdAsync(userId!);

            if (user == null || user.IsDeleted) // Check for soft delete
            {
                _logger.LogWarning("GetMyProfile: User {UserId} not found or soft-deleted.", userId);
                return NotFound(new ProblemDetails { Title = "User not found." });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var dto = MapToUserDetailDto(user, roles);
            return Ok(dto);
        }

        // --- Endpoint to Update Current User's Profile Details ---
        [HttpPut("me/profile")] // Handles PUT requests to /api/users/me/profile
        [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UserProfileUpdateDto updateDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null || user.IsDeleted)
            {
                _logger.LogWarning("UpdateMyProfile failed: User {UserId} not found or marked as deleted.", userId);
                return NotFound(new ProblemDetails { Title = "User not found." });
            }

            _logger.LogInformation("User {UserId} attempting to update profile.", userId);

            bool changed = false;
            if (!string.IsNullOrWhiteSpace(updateDto.FirstName) && user.FirstName != updateDto.FirstName) { user.FirstName = updateDto.FirstName; changed = true; }
            if (!string.IsNullOrWhiteSpace(updateDto.LastName) && user.LastName != updateDto.LastName) { user.LastName = updateDto.LastName; changed = true; }

            // Allow clearing address fields by setting to null or empty
            if (updateDto.AddressLine1 != user.AddressLine1) { user.AddressLine1 = updateDto.AddressLine1; changed = true; }
            if (updateDto.AddressLine2 != user.AddressLine2) { user.AddressLine2 = updateDto.AddressLine2; changed = true; }
            if (updateDto.City != user.City) { user.City = updateDto.City; changed = true; }
            if (updateDto.PostCode != user.PostCode) { user.PostCode = updateDto.PostCode; changed = true; }
            if (updateDto.Country != user.Country) { user.Country = updateDto.Country; changed = true; }

            // Not updating Email/PhoneNumber here as they usually involve confirmation flows.

            if (!changed)
            {
                _logger.LogInformation("User {UserId} submitted profile update with no changes.", userId);
                var noChangeRoles = await _userManager.GetRolesAsync(user);
                return Ok(MapToUserDetailDto(user, noChangeRoles)); // Return current data
            }

            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
            {
                _logger.LogInformation("User {UserId} profile updated successfully.", userId);
                var roles = await _userManager.GetRolesAsync(user);
                return Ok(MapToUserDetailDto(user, roles));
            }

            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            _logger.LogWarning("User {UserId} profile update failed. Errors: {Errors}", userId, errors);
            var problemDetails = new ValidationProblemDetails(result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }))
            {
                Title = "Profile update failed.",
                Status = StatusCodes.Status400BadRequest
            };
            return BadRequest(problemDetails);
        }


        // --- Endpoint to Upload/Update Avatar ---
        [HttpPost("me/avatar")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)] // Returns { avatarUrl: "new_url" }
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null || user.IsDeleted)
            {
                _logger.LogWarning("UploadAvatar failed: User {UserId} not found or deleted.", userId);
                return NotFound(new ProblemDetails { Title = "User not found." });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new ProblemDetails { Title = "No file uploaded or file is empty." });
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

            // File Saving Logic
            var storageFolder = Path.Combine("uploads", "avatars");
            // Ensure WebRootPath is not null, fallback to ContentRootPath + "wwwroot" if needed
            var webRootPath = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
            var relativeFolderPathForSaving = Path.Combine(webRootPath, storageFolder);

            try
            {
                if (!Directory.Exists(relativeFolderPathForSaving))
                {
                    Directory.CreateDirectory(relativeFolderPathForSaving);
                    _logger.LogInformation("Created avatar storage directory: {Path}", relativeFolderPathForSaving);
                }

                var uniqueFileName = $"{Guid.NewGuid()}{extension}";
                var absoluteFilePath = Path.Combine(relativeFolderPathForSaving, uniqueFileName);

                // Delete old avatar file if it exists and is different
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    // AvatarUrl is stored like "/uploads/avatars/filename.jpg"
                    // We need to map this to an absolute path on the server's filesystem
                    var oldRelativePathFromWwwRoot = user.AvatarUrl.TrimStart('/');
                    var oldAbsoluteFilePath = Path.Combine(webRootPath, oldRelativePathFromWwwRoot);
                    if (System.IO.File.Exists(oldAbsoluteFilePath))
                    {
                        try { System.IO.File.Delete(oldAbsoluteFilePath); }
                        catch (IOException ioEx) { _logger.LogWarning(ioEx, "Could not delete old avatar file (IO): {File}", oldAbsoluteFilePath); }
                        catch (Exception ex) { _logger.LogWarning(ex, "Could not delete old avatar file (General): {File}", oldAbsoluteFilePath); }
                    }
                }

                // Save new file
                using (var stream = new FileStream(absoluteFilePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                _logger.LogInformation("Avatar file saved for User {UserId} at {Path}", userId, absoluteFilePath);


                // Update Database with the relative URL path
                // Ensure consistent use of forward slashes for URLs
                var relativeUrlPath = $"/{storageFolder.Replace("\\", "/")}/{uniqueFileName}";
                user.AvatarUrl = relativeUrlPath;
                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded)
                {
                    // Attempt to delete the newly uploaded file if DB update fails
                    try { if (System.IO.File.Exists(absoluteFilePath)) System.IO.File.Delete(absoluteFilePath); }
                    catch (Exception cleanupEx) { _logger.LogWarning(cleanupEx, "Failed to cleanup uploaded avatar after DB update failure: {File}", absoluteFilePath); }

                    var errors = string.Join("; ", updateResult.Errors.Select(e => e.Description));
                    _logger.LogError("Failed to update user avatar URL in DB for {UserId}: {Errors}", userId, errors);
                    return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "Failed to update user profile with new avatar." });
                }

                _logger.LogInformation("User {UserId} avatar URL updated to: {AvatarUrl}", userId, user.AvatarUrl);
                return Ok(new { avatarUrl = user.AvatarUrl }); // Return new relative URL path

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while uploading avatar for user {UserId}.", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An error occurred saving the image file." });
            }
        }

        // --- Endpoint for Self-Service Account Deletion (Soft Delete) ---
        [HttpDelete("me/delete-account")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteMyAccount()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null || user.IsDeleted)
            {
                _logger.LogWarning("DeleteMyAccount failed: User {UserId} not found or already deleted.", userId);
                return NotFound(new ProblemDetails { Title = "User not found." });
            }

            string originalEmail = user.Email ?? $"user-{user.Id}@deleted.com"; // Keep original email for notification
            _logger.LogInformation("User {UserId} requesting account deletion.", userId);

            // --- Perform Soft Delete ---
            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;
            // Anonymize or clear PII to allow re-registration with same email later if desired, or just to clean up
            user.UserName = $"deleted_{user.Id.Substring(0, 8)}_{Guid.NewGuid().ToString("N").Substring(0, 8)}"; // Ensure uniqueness
            user.NormalizedUserName = user.UserName.ToUpperInvariant();
            user.Email = $"deleted_{user.Id.Substring(0, 8)}@{Guid.NewGuid().ToString("N").Substring(0, 4)}.example.com"; // Anonymized email
            user.NormalizedEmail = user.Email.ToUpperInvariant();
            user.PasswordHash = null; // Invalidate password
            user.SecurityStamp = Guid.NewGuid().ToString(); // Invalidate existing tokens/sessions
            user.AvatarUrl = null; // Clear avatar URL
            user.EmailConfirmed = false;
            user.PhoneNumber = null;
            user.PhoneNumberConfirmed = false;
            user.AddressLine1 = null; user.AddressLine2 = null; user.City = null; user.PostCode = null; user.Country = null;


            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = string.Join("; ", result.Errors.Select(e => e.Description));
                _logger.LogError("Failed to soft delete User ID {UserId}: {Errors}", userId, errors);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "Failed to process account deletion." });
            }

            // --- Send Notification Email ---
            var adminEmailForNotification = _configuration["AdminNotificationEmailForDeletions"]; // Example specific config
            var userSubject = "Wandle Wheelhouse Account Deletion Initiated";
            var userMessage = $"<p>Your account with Wandle Wheelhouse ({originalEmail}) has been marked for deletion.</p><p>Your personal details will be retained for 30 days, after which your data will be permanently removed. During this period, you may contact us if you wish to attempt reactivation, though this is not guaranteed.</p><p>If you did not request this, please contact support immediately.</p>";

            try
            {
                await _emailSender.SendEmailAsync(originalEmail, userSubject, userMessage);
                _logger.LogInformation("Sent account deletion notification to {Email} for User {UserId}", originalEmail, userId);

                if (!string.IsNullOrEmpty(adminEmailForNotification))
                {
                    await _emailSender.SendEmailAsync(adminEmailForNotification, $"User Account Marked for Deletion: {originalEmail}", $"User {originalEmail} (ID: {userId}) has marked their account for deletion at {user.DeletedAt} UTC.");
                }
            }
            catch (Exception emailEx)
            {
                _logger.LogError(emailEx, "Failed to send account deletion email to {Email} for User {UserId}", originalEmail, userId);
            }

            _logger.LogInformation("User {UserId} account soft deleted successfully.", userId);
            return NoContent(); // Success
        }


        // --- Helper Method to Map User Entity to DTO ---
        private UserDetailDto MapToUserDetailDto(User user, IList<string> roles)
        {
            return new UserDetailDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? string.Empty, // Ensure not null
                PhoneNumber = user.PhoneNumber,
                EmailConfirmed = user.EmailConfirmed,
                LockoutEnabled = user.LockoutEnabled,
                LockoutEnd = user.LockoutEnd,
                AddressLine1 = user.AddressLine1,
                AddressLine2 = user.AddressLine2,
                City = user.City,
                PostCode = user.PostCode,
                Country = user.Country,
                AvatarUrl = user.AvatarUrl,
                Roles = roles ?? new List<string>()
            };
        }
    }
}