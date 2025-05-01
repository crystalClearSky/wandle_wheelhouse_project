using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Services; // Assuming IEmailSender is here

namespace WandleWheelhouse.Api.Controllers;

[Authorize] // Requires users to be logged in
public class UsersController : BaseApiController
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailSender _emailSender; // Inject for notification
    private readonly ILogger<UsersController> _logger;

    public UsersController(UserManager<User> userManager, IEmailSender emailSender, ILogger<UsersController> logger)
    {
        _userManager = userManager;
        _emailSender = emailSender;
        _logger = logger;
    }

    // --- Endpoint for Self-Service Account Deletion ---
    [HttpDelete("me/delete-account")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteMyAccount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.IsDeleted) // Don't allow deleting already deleted
        {
            return NotFound("User not found.");
        }

        _logger.LogInformation("User {UserId} requesting account deletion.", userId);

        // --- Perform Soft Delete ---
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.UserName = $"{user.UserName}_deleted_{Guid.NewGuid().ToString("N").Substring(0, 8)}"; // Ensure username uniqueness after delete
        user.NormalizedUserName = user.UserName.ToUpperInvariant();
        user.Email = $"{user.Id}_deleted@{Guid.NewGuid().ToString("N").Substring(0, 8)}.local"; // Anonymize email
        user.NormalizedEmail = user.Email.ToUpperInvariant();
        user.PasswordHash = null; // Remove password
        user.SecurityStamp = Guid.NewGuid().ToString(); // Invalidate existing tokens/sessions

        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            _logger.LogError("Failed to soft delete User ID {UserId}: {Errors}", userId, errors);
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to delete account.");
        }

        // --- Send Notification Email ---
        string recipientEmail = user.Email; // Get email *before* anonymizing? Or use original from claims? Get it before update. Let's re-fetch original for email:
        var originalUser = await _userManager.FindByIdAsync(userId); // Fetch again to get original email if anonymized above
        if (originalUser != null && !string.IsNullOrWhiteSpace(originalUser.Email)) { recipientEmail = originalUser.Email; } else { recipientEmail = User.FindFirstValue(ClaimTypes.Email) ?? "User"; } // Fallback

        await _emailSender.SendEmailAsync(
            recipientEmail,
            "Wandle Wheelhouse Account Deletion Confirmation",
            $"<p>Your account with Wandle Wheelhouse has been marked for deletion.</p><p>Your personal details will be retained for 30 days in case you wish to reactivate your account during this period. After 30 days, your data will be permanently removed.</p><p>If you did not request this, please contact support immediately.</p>"
        );

        _logger.LogInformation("User {UserId} account soft deleted successfully.", userId);
        return NoContent();
    }

    // TODO: Add endpoints for changing password, updating profile etc. here later
}