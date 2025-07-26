// Location: src/WandleWheelhouse.Api/Controllers/NewsletterController.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using WandleWheelhouse.Api.DTOs.Common; // For PagedResultDto
using WandleWheelhouse.Api.DTOs.Newsletter; // Contains your DTOs
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork;

namespace WandleWheelhouse.Api.Controllers
{
    public class NewsletterController : BaseApiController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<User> _userManager;
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
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Subscribe([FromBody] NewsletterSubscriptionRequestDto requestDto)
        {
            // --- Your existing Subscribe logic (looks okay assuming DoesEmailExistAsync exists) ---
            _logger.LogInformation("Newsletter subscription request for Email: {Email}", requestDto.Email);
            var normalizedEmail = requestDto.Email.Trim().ToLowerInvariant();
            // Ensure DoesEmailExistAsync is implemented in your repo or use AnyAsync here
            bool exists = await _unitOfWork.NewsletterSubscriptions.DoesEmailExistAsync(normalizedEmail);
            if (exists) { return Conflict(new { message = "This email address is already subscribed." }); }
            string? userId = User.Identity?.IsAuthenticated ?? false ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
            var newSubscription = new NewsletterSubscription { /* ... populate ... */ };
            try
            {
                await _unitOfWork.NewsletterSubscriptions.AddAsync(newSubscription); await _unitOfWork.CompleteAsync();
                return NoContent();
            }
            catch (Exception ex) { /* ... error handling ... */ return StatusCode(500); }
        }


        // --- Endpoint to Get All Newsletter Subscriptions (Admin/Editor Only) - UPDATED ---
        [HttpGet("subscriptions")]
        [Authorize(Roles = "Administrator,Editor")]
        // --- Use NewsletterSubscriptionResponseDto in Response Type ---
        [ProducesResponseType(typeof(PagedResultDto<NewsletterSubscriptionResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAllSubscriptions([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            _logger.LogInformation("Admin/Editor request: Getting all newsletter subscriptions. Page: {Page}, Size: {Size}", pageNumber, pageSize);

            try
            {
                var query = _unitOfWork.Context.NewsletterSubscriptions
                                  .OrderByDescending(s => s.SubscriptionDate); // Order by most recent

                var totalCount = await query.CountAsync();

                var subscriptions = await query
                                         .Skip((pageNumber - 1) * pageSize)
                                         .Take(pageSize)
                                         .AsNoTracking() // Read-only optimization
                                         .ToListAsync();

                // Map to DTO using the MapToDto helper (which returns NewsletterSubscriptionResponseDto)
                var subscriptionDtos = subscriptions.Select(s => MapToDto(s)).ToList();

                // --- Use NewsletterSubscriptionResponseDto for Paged Result ---
                var pagedResult = new PagedResultDto<NewsletterSubscriptionResponseDto>
                {
                    Items = subscriptionDtos,
                    TotalCount = totalCount,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };

                return Ok(pagedResult);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all newsletter subscriptions for admin.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve newsletter subscriptions.");
            }
        }


        // --- Helper to map Entity to DTO (matches your provided definition) ---
        private NewsletterSubscriptionResponseDto MapToDto(NewsletterSubscription subscription)
        {
            return new NewsletterSubscriptionResponseDto
            {
                NewsletterSubscriptionId = subscription.NewsletterSubscriptionId,
                Email = subscription.Email,
                SubscriptionDate = subscription.SubscriptionDate,
                UserId = subscription.UserId // Include UserId as per your DTO
            };
        }

        // Example DoesEmailExistAsync implementation (if not in repo)
        // private async Task<bool> DoesEmailExistAsync(string normalizedEmail)
        // {
        //     return await _unitOfWork.Context.NewsletterSubscriptions.AnyAsync(ns => ns.Email.ToLower() == normalizedEmail);
        // }
    }
}