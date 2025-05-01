using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using WandleWheelhouse.Api.DTOs.Subscriptions;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using WandleWheelhouse.Api.Services; // Required for Include

namespace WandleWheelhouse.Api.Controllers;

public class SubscriptionsController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<SubscriptionsController> _logger;
    // --- This field declaration MUST exist ---
    private readonly IEmailSender _emailSender;

    // --- The Constructor MUST take IEmailSender and assign it ---
    public SubscriptionsController(
        IUnitOfWork unitOfWork,
        UserManager<User> userManager,
        ILogger<SubscriptionsController> logger,
        IEmailSender emailSender // <-- Ensure IEmailSender parameter is here
        )
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _logger = logger;
        _emailSender = emailSender; // <-- Ensure this assignment line is here
    }

    // --- Endpoint to Create a New Subscription ---
    [HttpPost("create")]
    [Authorize] // Only logged-in users can create subscriptions
    [ProducesResponseType(typeof(SubscriptionResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateSubscription([FromBody] SubscriptionRequestDto subscriptionRequestDto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized(); // Should be caught by [Authorize], but check defensively

        var currentUser = await _userManager.FindByIdAsync(userId);
        if (currentUser == null) return Unauthorized("User not found.");

        _logger.LogInformation("User {UserId} attempting to create subscription for Amount: {Amount}, Method: {Method}",
            userId, subscriptionRequestDto.MonthlyAmount, subscriptionRequestDto.Method);

        // Optional: Check if user already has an active subscription? Decide policy.
        // var existingActive = await _unitOfWork.Subscriptions
        //    .FindAsync(s => s.UserId == userId && s.Status == SubscriptionStatus.Active);
        // if (existingActive.Any()) {
        //     return BadRequest("User already has an active subscription.");
        // }

        // --- Mock Recurring Payment Setup ---
        // In a real app, interact with payment provider API here to create a subscription/billing agreement
        string mockProviderSubscriptionId = $"MOCK_SUB_{subscriptionRequestDto.Method}_{Guid.NewGuid()}";
        bool setupSuccess = await SimulateRecurringSetupAsync(subscriptionRequestDto);

        if (!setupSuccess)
        {
            _logger.LogWarning("Simulated recurring payment setup failed for User {UserId}.", userId);
            return BadRequest("Failed to set up recurring payment with provider.");
        }

        var subscription = new Subscription
        {
            SubscriptionId = Guid.NewGuid(),
            UserId = userId,
            MonthlyAmount = subscriptionRequestDto.MonthlyAmount,
            Method = subscriptionRequestDto.Method,
            Status = SubscriptionStatus.Active,
            StartDate = DateTime.UtcNow,
            // Calculate initial next payment date (e.g., one month from now)
            NextPaymentDate = DateTime.UtcNow.AddMonths(1),
            ProviderSubscriptionId = mockProviderSubscriptionId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            // User navigation property will be null here unless explicitly loaded
        };

        try
        {
            await _unitOfWork.Subscriptions.AddAsync(subscription);
            await _unitOfWork.CompleteAsync();
            _logger.LogInformation("Subscription {SubscriptionId} created successfully for User {UserId}. Provider ID: {ProviderId}",
                subscription.SubscriptionId, userId, subscription.ProviderSubscriptionId);

            // Map including user info before returning
            var responseDto = MapToDto(subscription, currentUser);
            return StatusCode(StatusCodes.Status201Created, responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while saving subscription for User {UserId}.", userId);
            // TODO: Potentially try to cancel the recurring payment with the provider if DB save fails
            return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while creating the subscription.");
        }
    }

    // --- Mock Recurring Payment Setup Simulation ---
    private async Task<bool> SimulateRecurringSetupAsync(SubscriptionRequestDto request)
    {
        await Task.Delay(TimeSpan.FromMilliseconds(200 + new Random().Next(500))); // Simulate network
        _logger.LogInformation("Simulated recurring payment setup for Amount {Amount}: Success", request.MonthlyAmount);
        return true; // Assume success for now
    }

    // --- Endpoint to Get Current User's Active Subscriptions ---
    [HttpGet("mine")]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<SubscriptionResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMySubscriptions()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        _logger.LogInformation("User {UserId} request: Getting own subscriptions.", userId);

        // Find subscriptions for the user, explicitly include User data for mapping
        // Using a specific method would be cleaner, but FindAsync with Include works too
        var subscriptions = await _unitOfWork.Subscriptions.FindAsync(s => s.UserId == userId);
        // Optionally filter for Active only if needed: .Where(s => s.Status == SubscriptionStatus.Active)

        // Since FindAsync doesn't support Include directly, we might need a custom repo method
        // or load user separately if needed for DTO. Let's adjust the DTO mapping logic.
        var currentUser = await _userManager.FindByIdAsync(userId); // Load user once

        var dtos = subscriptions
                        .OrderByDescending(s => s.StartDate)
                        .Select(s => MapToDto(s, currentUser)) // Pass user to map
                        .ToList();
        return Ok(dtos);
    }


    // --- Endpoint to Cancel a Subscription ---
    [HttpPost("{id:guid}/cancel")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)] // Or 200 OK with updated DTO
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelSubscription(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        _logger.LogInformation("User {UserId} attempting to cancel subscription {SubscriptionId}", userId, id);

        var subscription = await _unitOfWork.Subscriptions.GetByIdAsync(id);

        if (subscription == null)
        {
            _logger.LogWarning("Cancel failed: Subscription {SubscriptionId} not found.", id);
            return NotFound();
        }

        // IMPORTANT: Verify the user owns this subscription
        if (subscription.UserId != userId)
        {
            _logger.LogWarning("Cancel forbidden: User {UserId} does not own Subscription {SubscriptionId}.", userId, id);
            // Return 403 Forbidden or 404 NotFound (hides existence from other users)
            return Forbid(); // Or NotFound();
        }

        if (subscription.Status == SubscriptionStatus.Cancelled)
        {
            _logger.LogInformation("Cancel skipped: Subscription {SubscriptionId} already cancelled.", id);
            return BadRequest("Subscription is already cancelled.");
        }

        // Check if already pending or cancelled
        if (subscription.Status == SubscriptionStatus.Cancelled || subscription.Status == SubscriptionStatus.CancellationPending)
        {
            _logger.LogInformation("Cancel skipped: Subscription {SubscriptionId} already cancelled or pending cancellation.", id);
            return BadRequest("Subscription is already cancelled or pending cancellation.");
        }
        // --- Mock Recurring Payment Cancellation ---
        // In a real app, call provider API here using subscription.ProviderSubscriptionId
        bool cancelSuccess = await SimulateRecurringCancelAsync(subscription.ProviderSubscriptionId);
        if (!cancelSuccess)
        {
            _logger.LogError("Simulated provider cancellation failed for ProviderSubscriptionId: {ProviderId}", subscription.ProviderSubscriptionId);
            // Decide whether to proceed with DB update or return error
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to cancel subscription with payment provider.");
        }

        subscription.Status = SubscriptionStatus.CancellationPending; // Mark as pending
        subscription.CancellationRequestedDate = DateTime.UtcNow; // Record request time
        subscription.CancellationDate = subscription.NextPaymentDate; // Set expiry date to NEXT payment date
        subscription.UpdatedAt = DateTime.UtcNow;
        
        // Find user details needed for email
        var user = await _userManager.FindByIdAsync(userId!); // Assuming userId is not null due to [Authorize]
        if (user != null && !string.IsNullOrWhiteSpace(user.Email))
        {
            // This call should now work because _emailSender is initialized
            await _emailSender.SendEmailAsync(
                user.Email,
                "Wandle Wheelhouse Subscription Cancellation",
                $"<p>Your subscription for £{subscription.MonthlyAmount:F2}/month has been scheduled for cancellation.</p><p>It will remain active until {subscription.CancellationDate:yyyy-MM-dd}.</p>"
            );
        }
        else
        {
            _logger.LogWarning("Could not send cancellation email for subscription {SubscriptionId} as user email was not found.", id);
        }


        // --- Send Notification Email ---
        // var user = await _userManager.FindByIdAsync(userId);
        // if (user != null)
        // {
        //     await _emailSender.SendEmailAsync(
        //         user.Email!,
        //         "Wandle Wheelhouse Subscription Cancellation",
        //         $"<p>Your subscription for £{subscription.MonthlyAmount:F2}/month has been scheduled for cancellation.</p><p>It will remain active until {subscription.CancellationDate:yyyy-MM-dd}.</p>"
        //     );
        // }

        _logger.LogInformation("Subscription {SubscriptionId} cancellation requested successfully for User {UserId}. Will end on {EndDate}", id, userId, subscription.CancellationDate);

        return Ok(MapToDto(subscription, await _userManager.FindByIdAsync(userId))); // Return updated DTO
    }

    // --- Mock Recurring Payment Cancellation Simulation ---
    private async Task<bool> SimulateRecurringCancelAsync(string? providerSubscriptionId)
    {
        await Task.Delay(TimeSpan.FromMilliseconds(150 + new Random().Next(300))); // Simulate network
        _logger.LogInformation("Simulated cancellation for ProviderSubscriptionId {ProviderId}: Success", providerSubscriptionId);
        return true; // Assume success
    }


    // --- Endpoint to Get All Subscriptions (Admin/Editor Only) ---
    [HttpGet]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(IEnumerable<SubscriptionResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllSubscriptions()
    {
        _logger.LogInformation("Admin/Editor request: Getting all subscriptions.");
        // Eagerly load User data when getting all subscriptions
        var subscriptions = await _unitOfWork.Context.Subscriptions // Access context directly for Include
                        .Include(s => s.User)
                        .OrderByDescending(s => s.StartDate)
                        .ToListAsync();

        var dtos = subscriptions.Select(s => MapToDto(s, s.User)).ToList(); // Use loaded user data
        return Ok(dtos);
        // TODO: Implement Pagination
    }


    // --- Helper Method to Map Subscription Entity to DTO ---
    // Pass User object to avoid multiple lookups if user data is needed
    private SubscriptionResponseDto MapToDto(Subscription subscription, User? user)
    {
        return new SubscriptionResponseDto
        {
            SubscriptionId = subscription.SubscriptionId,
            MonthlyAmount = subscription.MonthlyAmount,
            Method = subscription.Method,
            Status = subscription.Status,
            StartDate = subscription.StartDate,
            NextPaymentDate = subscription.NextPaymentDate,
            CancellationDate = subscription.CancellationDate,
            ProviderSubscriptionId = subscription.ProviderSubscriptionId,
            UserId = subscription.UserId,
            UserFullName = user != null ? $"{user.FirstName} {user.LastName}" : null // Use passed user data
        };
    }
}
