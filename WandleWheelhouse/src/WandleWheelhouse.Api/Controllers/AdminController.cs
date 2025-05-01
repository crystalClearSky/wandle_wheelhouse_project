using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // For ToListAsync on IQueryable users/roles
using WandleWheelhouse.Api.DTOs.Admin;
using WandleWheelhouse.Api.DTOs.Common; // For PagedResultDto
using WandleWheelhouse.Api.DTOs.Roles;
using WandleWheelhouse.Api.DTOs.Users;
using WandleWheelhouse.Api.Models; // Your User model
using System.Security.Claims;
using WandleWheelhouse.Api.Services; // For getting current admin ID

namespace WandleWheelhouse.Api.Controllers;

[Authorize(Roles = "Administrator")] // Secure the entire controller for Administrators ONLY
public class AdminController : BaseApiController
{
  // Required fields (ensure ALL needed services are declared)
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<AdminController> _logger;
    private readonly IConfiguration _configuration; // <-- ADD THIS FIELD
    private readonly IEmailSender _emailSender;     // <-- ADD THIS FIELD

    // Updated Constructor
    public AdminController(
        UserManager<User> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<AdminController> logger,
        IConfiguration configuration, // <-- ADD IConfiguration PARAMETER
        IEmailSender emailSender     // <-- ADD IEmailSender PARAMETER
        )
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
        _configuration = configuration; // <-- ADD THIS ASSIGNMENT
        _emailSender = emailSender;     // <-- ADD THIS ASSIGNMENT
    }

    // --- Endpoint to List Users (Paginated) ---
    [HttpGet("users")]
    [ProducesResponseType(typeof(PagedResultDto<UserDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 50) pageSize = 50; // Max page size

        _logger.LogInformation("Admin request: Getting users list. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);

        var query = _userManager.Users.Where(u => !u.IsDeleted); // Exclude deleted users
        var totalCount = await query.CountAsync();
        var users = await query.OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

        // Get roles for each user efficiently (consider optimizing for very large pages)
        var userDtos = new List<UserDetailDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            userDtos.Add(MapToUserDetailDto(user, roles));
        }

        var pagedResult = new PagedResultDto<UserDetailDto>
        {
            Items = userDtos,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        return Ok(pagedResult);
    }

    // --- Endpoint to List Available Roles ---
    [HttpGet("roles")]
    [ProducesResponseType(typeof(IEnumerable<RoleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoles()
    {
        _logger.LogInformation("Admin request: Getting available roles list.");
        var roles = await _roleManager.Roles.OrderBy(r => r.Name).ToListAsync();
        var roleDtos = roles.Select(r => new RoleDto { Id = r.Id, Name = r.Name! }).ToList();
        return Ok(roleDtos);
    }

    // --- Endpoint to Get Specific User Details ---
    [HttpGet("users/{userId}")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUserById(string userId)
    {
        _logger.LogInformation("Admin request: Getting details for User ID: {UserId}", userId);
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("Admin request failed: User ID {UserId} not found.", userId);
            return NotFound($"User with ID {userId} not found.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var dto = MapToUserDetailDto(user, roles);
        return Ok(dto);
    }

    // --- Endpoint to Assign a Role to a User ---
    [HttpPost("users/{userId}/roles")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignRoleToUser(string userId, [FromBody] AssignRoleDto assignRoleDto)
    {
        string roleName = assignRoleDto.RoleName.Trim();
        _logger.LogInformation("Admin request: Assigning role '{RoleName}' to User ID: {UserId}", roleName, userId);

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("Assign role failed: User ID {UserId} not found.", userId);
            return NotFound($"User with ID {userId} not found.");
        }

        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            _logger.LogWarning("Assign role failed: Role '{RoleName}' does not exist.", roleName);
            return BadRequest($"Role '{roleName}' does not exist.");
        }

        if (await _userManager.IsInRoleAsync(user, roleName))
        {
            _logger.LogInformation("Assign role skipped: User {UserId} already has role '{RoleName}'.", userId, roleName);
            return BadRequest($"User already has the role '{roleName}'.");
        }

        var result = await _userManager.AddToRoleAsync(user, roleName);
        if (result.Succeeded)
        {
            _logger.LogInformation("Role '{RoleName}' successfully assigned to User ID: {UserId}", roleName, userId);
            return NoContent();
        }
        else
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            _logger.LogError("Failed to assign role '{RoleName}' to User ID {UserId}: {Errors}", roleName, userId, errors);
            return BadRequest($"Failed to assign role: {errors}");
        }
    }

    // --- Endpoint to Remove a Role from a User ---
    [HttpDelete("users/{userId}/roles/{roleName}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveRoleFromUser(string userId, string roleName)
    {
        roleName = Uri.UnescapeDataString(roleName); // Decode URL encoded role name if needed
        _logger.LogInformation("Admin request: Removing role '{RoleName}' from User ID: {UserId}", roleName, userId);

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("Remove role failed: User ID {UserId} not found.", userId);
            return NotFound($"User with ID {userId} not found.");
        }

        // Optional: Check if role exists before trying to remove (good practice)
        if (!await _roleManager.RoleExistsAsync(roleName))
        {
            _logger.LogWarning("Remove role skipped: Role '{RoleName}' does not exist.", roleName);
            // Return BadRequest or just proceed (RemoveFromRoleAsync handles non-existent roles gracefully)
            // return BadRequest($"Role '{roleName}' does not exist.");
        }

        if (!await _userManager.IsInRoleAsync(user, roleName))
        {
            _logger.LogInformation("Remove role skipped: User {UserId} does not have role '{RoleName}'.", userId, roleName);
            return BadRequest($"User does not have the role '{roleName}'.");
        }

        // --- Safety Check: Prevent removing the last Administrator ---
        if (roleName.Equals("Administrator", StringComparison.OrdinalIgnoreCase))
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId.Equals(currentUserId)) // Trying to remove own Admin role
            {
                var admins = await _userManager.GetUsersInRoleAsync("Administrator");
                if (admins.Count <= 1) // If this user is the only admin left
                {
                    _logger.LogError("Remove role forbidden: Cannot remove the last Administrator role.");
                    return BadRequest("Cannot remove the last Administrator role.");
                }
            }
        }
        // --- End Safety Check ---


        var result = await _userManager.RemoveFromRoleAsync(user, roleName);
        if (result.Succeeded)
        {
            _logger.LogInformation("Role '{RoleName}' successfully removed from User ID: {UserId}", roleName, userId);
            return NoContent();
        }
        else
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            _logger.LogError("Failed to remove role '{RoleName}' from User ID {UserId}: {Errors}", roleName, userId, errors);
            return BadRequest($"Failed to remove role: {errors}");
        }
    }

    // Add this method inside AdminController class:

    // --- Endpoint for Admin to Remove/Soft-Delete a User ---
    [HttpDelete("users/{userId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)] // Maybe needed if trying to delete self
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveUserByAdmin(string userId)
    {
        var performingAdminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _logger.LogInformation("Admin {AdminId} attempting to remove User ID: {UserId}", performingAdminId, userId);

        if (userId.Equals(performingAdminId, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Admin remove user failed: Admin {AdminId} cannot remove themselves.", performingAdminId);
            return BadRequest("Administrators cannot remove their own account.");
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.IsDeleted)
        {
            _logger.LogWarning("Admin remove user failed: User ID {UserId} not found or already deleted.", userId);
            return NotFound($"User with ID {userId} not found or already deleted.");
        }

        // Optional: Prevent deleting other Admins?
        // if (await _userManager.IsInRoleAsync(user, "Administrator")) {
        //     _logger.LogWarning("Admin remove user forbidden: Admin {AdminId} attempted to remove fellow Administrator {UserId}.", performingAdminId, userId);
        //     return Forbid("Cannot remove another Administrator account via this endpoint.");
        // }

        string originalEmail = user.Email!; // Store before anonymizing

        // --- Perform Soft Delete ---
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        user.UserName = $"{user.UserName}_deleted_{Guid.NewGuid().ToString("N").Substring(0, 8)}";
        user.NormalizedUserName = user.UserName.ToUpperInvariant();
        user.Email = $"{user.Id}_deleted@{Guid.NewGuid().ToString("N").Substring(0, 8)}.local";
        user.NormalizedEmail = user.Email.ToUpperInvariant();
        user.PasswordHash = null;
        user.SecurityStamp = Guid.NewGuid().ToString();

        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            _logger.LogError("Admin remove user failed for User ID {UserId}: {Errors}", userId, errors);
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to remove user account.");
        }

        // --- Send Notification Email ---
        // TODO: Get Admin contact email from configuration?
        string adminContactEmail = _configuration["AppSettings:AdminContactEmail"] ?? "support@wandlewheelhouse.org"; // Example

        await _emailSender.SendEmailAsync(
            originalEmail, // Send to original email
            "Your Wandle Wheelhouse Account Has Been Removed",
            $"<p>Your account with Wandle Wheelhouse has been removed by an administrator.</p><p>If you believe this was in error, please contact support at {adminContactEmail}.</p>"
        );

        _logger.LogInformation("User {UserId} account soft deleted successfully by Admin {AdminId}.", userId, performingAdminId);
        return NoContent();
    }

    // --- Helper to map User entity to DTO ---
    private UserDetailDto MapToUserDetailDto(User user, IList<string> roles)
    {
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
            Roles = roles ?? new List<string>() // Ensure Roles list is not null
        };
    }
}