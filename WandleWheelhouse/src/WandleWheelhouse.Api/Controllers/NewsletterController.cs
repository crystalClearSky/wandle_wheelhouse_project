using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WandleWheelhouse.Api.DTOs.Newsletter;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork;

namespace WandleWheelhouse.Api.Controllers;

public class NewsletterController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<User> _userManager; // To potentially link logged-in user
    private readonly ILogger<NewsletterController> _logger;

    public NewsletterController(
        IUnitOfWork unitOfWork,
        UserManager<User> userManager,
        ILogger<NewsletterController> logger)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _logger = logger;
    }

    // --- Endpoint to Subscribe to Newsletter ---
    [HttpPost("subscribe")]
    [AllowAnonymous] // Anyone can subscribe
    [ProducesResponseType(StatusCodes.Status204NoContent)] // Success, no content needed back
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)] // Email already exists
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Subscribe([FromBody] NewsletterSubscriptionRequestDto requestDto)
    {
        _logger.LogInformation("Newsletter subscription request for Email: {Email}", requestDto.Email);

        // Normalize email for consistent checking
        var normalizedEmail = requestDto.Email.Trim().ToLowerInvariant();

        // Check if email already exists using repository method (assumes case-insensitive check there)
        // Or do the check directly here for simplicity if repo method isn't specific enough
        bool exists = await _unitOfWork.NewsletterSubscriptions.DoesEmailExistAsync(normalizedEmail);
        // Note: AnyAsync is not part of the generic interface, requires specific repo method or direct context access.
        // Let's assume a specific method exists or implement it:
        // bool exists = await _unitOfWork.NewsletterSubscriptions.DoesEmailExistAsync(normalizedEmail); // Assumes method exists

        // Alternative check without specific repo method:
        // var existingSub = await _unitOfWork.NewsletterSubscriptions.FindAsync(ns => ns.Email.ToLower() == normalizedEmail);
        // bool exists = existingSub.Any();

        if (exists)
        {
            _logger.LogWarning("Subscription failed: Email {Email} already subscribed.", requestDto.Email);
            // Return Conflict (409) as the resource (subscription for this email) already exists
            return Conflict(new { message = "This email address is already subscribed." });
        }

        // Check if user is logged in to optionally link the subscription
        string? userId = null;
        if (User.Identity?.IsAuthenticated ?? false)
        {
            userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("Subscription linked to User ID: {UserId}", userId);
        }

        var newSubscription = new NewsletterSubscription
        {
            NewsletterSubscriptionId = Guid.NewGuid(),
            Email = normalizedEmail, // Store normalized email
            UserId = userId, // Null if anonymous
            SubscriptionDate = DateTime.UtcNow,
            ConsentGiven = true // Implicit consent by subscribing
        };

        try
        {
            await _unitOfWork.NewsletterSubscriptions.AddAsync(newSubscription);
            await _unitOfWork.CompleteAsync();
            _logger.LogInformation("Email {Email} successfully subscribed to newsletter.", requestDto.Email);

            return NoContent(); // Successfully created, no need to return data
        }
        catch (Exception ex)
        {
            // Check for specific exceptions like unique constraint violation if the check above somehow failed
            if (ex.InnerException?.Message.Contains("UNIQUE constraint failed: NewsletterSubscriptions.Email") ?? false)
            {
                _logger.LogWarning("Subscription failed due to DB constraint: Email {Email} already subscribed.", requestDto.Email);
                return Conflict(new { message = "This email address is already subscribed." });
            }

            _logger.LogError(ex, "Error occurred while saving newsletter subscription for {Email}.", requestDto.Email);
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while subscribing.");
        }
    }


    // --- Endpoint to Get All Newsletter Subscriptions (Admin/Editor Only) ---
    [HttpGet("subscriptions")]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(IEnumerable<NewsletterSubscriptionResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSubscriptions()
    {
        _logger.LogInformation("Admin/Editor request: Getting all newsletter subscriptions.");
        var subscriptions = await _unitOfWork.NewsletterSubscriptions.GetAllAsync();

        var dtos = subscriptions
                        .OrderBy(s => s.Email) // Order alphabetically
                        .Select(MapToDto)
                        .ToList();

        return Ok(dtos);
        // TODO: Add pagination if the list grows large
    }


    // --- Helper to map Entity to DTO ---
    private NewsletterSubscriptionResponseDto MapToDto(NewsletterSubscription subscription)
    {
        return new NewsletterSubscriptionResponseDto
        {
            NewsletterSubscriptionId = subscription.NewsletterSubscriptionId,
            Email = subscription.Email,
            SubscriptionDate = subscription.SubscriptionDate,
            UserId = subscription.UserId
        };
    }

    // --- Helper for AnyAsync needed in Subscribe method ---
    // This requires access to the DbContext, either directly or via a specific repo method.
    // Adding a specific method to INewsletterSubscriptionRepository is cleaner.

    // Example if adding to INewsletterSubscriptionRepository:
    // Task<bool> DoesEmailExistAsync(string email);

    // Example implementation in NewsletterSubscriptionRepository:
    // public async Task<bool> DoesEmailExistAsync(string email)
    // {
    //     string normalizedEmail = email.ToLowerInvariant();
    //     return await _dbSet.AnyAsync(ns => ns.Email.ToLower() == normalizedEmail);
    // }
}

// --- Add AnyAsync extension method to IGenericRepository (alternative, less type-safe) ---
// Not recommended if specific methods can be added to specific repos.
// namespace WandleWheelhouse.Api.Repositories.Interfaces
// {
//     using Microsoft.EntityFrameworkCore; // Required
//     using System.Linq.Expressions; // Required

//     public static class GenericRepositoryExtensions
//     {
//         // WARNING: This requires exposing the DbContext or DbSet somehow from the generic repo,
//         // which breaks encapsulation or requires casting. Not ideal.
//         // public static async Task<bool> AnyAsync<T>(this IGenericRepository<T> repository, Expression<Func<T, bool>> predicate) where T : class
//         // {
//         //    // Implementation would depend on how you expose querying capabilities
//         //    // Example (if DbSet was accessible): return await repository.DbSet.AnyAsync(predicate);
//         //    throw new NotSupportedException("AnyAsync requires specific implementation or DbContext access.");
//         // }
//     }
// }