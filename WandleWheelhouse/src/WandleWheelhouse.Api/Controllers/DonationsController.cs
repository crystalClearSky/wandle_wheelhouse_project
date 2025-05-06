// Location: src/WandleWheelhouse.Api/Controllers/DonationsController.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims; // Required for User.FindFirstValue
using WandleWheelhouse.Api.DTOs.Donations; // Contains DonationRequestDto, DonationResponseDto
using WandleWheelhouse.Api.DTOs.Common;    // Contains PagedResultDto
using WandleWheelhouse.Api.Models;         // Contains Donation, User, PaymentMethod, PaymentStatus enums
using WandleWheelhouse.Api.UnitOfWork;     // Contains IUnitOfWork
using Microsoft.EntityFrameworkCore;       // For EF Core methods like Include, CountAsync, ToListAsync etc.
using Microsoft.Extensions.Logging;        // For ILogger
using Microsoft.AspNetCore.Http;           // For StatusCodes

namespace WandleWheelhouse.Api.Controllers
{
    // Assume BaseApiController applies [ApiController] and [Route("api/[controller]")]
    public class DonationsController : BaseApiController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<DonationsController> _logger;

        public DonationsController(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            ILogger<DonationsController> logger)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _logger = logger;
        }

        // --- Endpoint to Process a New Donation ---
        [HttpPost("process")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(DonationResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ProcessDonation([FromBody] DonationRequestDto donationRequestDto)
        {
            _logger.LogInformation("Processing donation request - Amount: {Amount}, Method: {Method}",
                donationRequestDto.Amount, donationRequestDto.Method);

            User? currentUser = null;
            string? userId = User.Identity?.IsAuthenticated ?? false ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;

            if (userId != null)
            {
                currentUser = await _userManager.FindByIdAsync(userId);
                if (currentUser == null)
                {
                    _logger.LogWarning("Authenticated user ID {UserId} not found during donation processing.", userId);
                    // Decide if this is an error or should proceed as anonymous
                    // Let's treat it as an error for logged-in state consistency
                    return Unauthorized("User session invalid.");
                }
                _logger.LogInformation("Donation initiated by logged-in user: {UserId}", userId);
            }
            else
            {
                 // Basic validation for anonymous donations
                if (string.IsNullOrWhiteSpace(donationRequestDto.DonorEmail))
                {
                    return BadRequest(new ProblemDetails { Title = "Donor email is required for anonymous donations." });
                }
                _logger.LogInformation("Processing anonymous donation from {Email}", donationRequestDto.DonorEmail);
            }

            // --- Mock Payment Processing ---
            bool paymentSuccess = await SimulatePaymentAsync(donationRequestDto);
            string? mockTransactionId = paymentSuccess ? $"MOCK_{donationRequestDto.Method}_{Guid.NewGuid()}" : null;

            var donation = new Donation
            {
                DonationId = Guid.NewGuid(),
                Amount = donationRequestDto.Amount,
                Method = donationRequestDto.Method,
                Status = paymentSuccess ? PaymentStatus.Success : PaymentStatus.Failed,
                DonationDate = DateTime.UtcNow,
                TransactionId = mockTransactionId,
                UserId = currentUser?.Id, // Link user if logged in
                // Store relevant donor info regardless (useful if user is deleted later)
                DonorFirstName = currentUser?.FirstName ?? donationRequestDto.DonorFirstName,
                DonorLastName = currentUser?.LastName ?? donationRequestDto.DonorLastName,
                DonorEmail = currentUser?.Email ?? donationRequestDto.DonorEmail, // Prioritize logged-in user's email
                IsRecurring = false, // This endpoint is for one-off donations
                SubscriptionId = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            try
            {
                await _unitOfWork.Donations.AddAsync(donation);
                await _unitOfWork.CompleteAsync();

                if (!paymentSuccess)
                {
                    _logger.LogWarning("Simulated payment failed for donation request. Donation record saved with ID {DonationId}", donation.DonationId);
                     // Still return Ok, but DTO status will indicate failure
                     return Ok(MapToDto(donation));
                }

                _logger.LogInformation("Donation {DonationId} created successfully.", donation.DonationId);
                var responseDto = MapToDto(donation);
                // Use Status 200 OK or 201 Created (201 requires a location, using 200 for simplicity)
                return Ok(responseDto);
                // Or use CreatedAtAction if GetDonationById is ready:
                // return CreatedAtAction(nameof(GetDonationById), new { id = donation.DonationId }, responseDto);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while saving donation.");
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while processing your donation.");
            }
        }

        // --- Mock Payment Simulation ---
        private async Task<bool> SimulatePaymentAsync(DonationRequestDto request)
        {
            await Task.Delay(TimeSpan.FromMilliseconds(100 + new Random().Next(300)));
            bool success = request.Amount >= 1.00m; // Example logic
            _logger.LogInformation("Simulated payment result for Amount {Amount}: {Result}", request.Amount, success ? "Success" : "Failed");
            return success;
        }


        // --- Endpoint to Get All Donations (Admin/Editor Only) - Includes Pagination & User ---
        [HttpGet("all")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(PagedResultDto<DonationResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAllDonations([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10) // Added Pagination params
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100; // Max limit

            _logger.LogInformation("Admin/Editor request for all donations. Page: {Page}, Size: {Size}", pageNumber, pageSize);

            try
            {
                var query = _unitOfWork.Context.Donations
                                  .Include(d => d.User) // <-- Include User details for mapping
                                  .OrderByDescending(d => d.DonationDate);

                var totalCount = await query.CountAsync(); // Get total count for pagination header

                var donations = await query
                                     .Skip((pageNumber - 1) * pageSize)
                                     .Take(pageSize)
                                     .ToListAsync();

                // Map results to DTO using the updated helper
                var donationDtos = donations.Select(d => MapToDto(d)).ToList(); // Use updated MapToDto

                var pagedResult = new PagedResultDto<DonationResponseDto>
                {
                    Items = donationDtos,
                    TotalCount = totalCount,
                    PageNumber = pageNumber,
                    PageSize = pageSize
                };

                return Ok(pagedResult);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all donations for admin.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve donations.");
            }
        }

        // --- Endpoint to Get Donations for Current User ---
        [HttpGet("mine")]
        [Authorize]
        [ProducesResponseType(typeof(IEnumerable<DonationResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyDonations()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            _logger.LogInformation("User {UserId} request: Getting own donations.", userId);
            try {
                var donations = await _unitOfWork.Context.Donations
                                        .Include(d => d.User) // Include user for consistency in mapping
                                        .Where(d => d.UserId == userId)
                                        .OrderByDescending(d => d.DonationDate)
                                        .ToListAsync();
                var dtos = donations.Select(d => MapToDto(d)).ToList(); // Use updated MapToDto
                return Ok(dtos);
            } catch (Exception ex) {
                 _logger.LogError(ex, "Error fetching donations for user {UserId}", userId);
                 return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve your donations.");
            }
        }

        // --- Endpoint to Get Specific Donation by ID (Admin/Editor Only) ---
        [HttpGet("{id:guid}", Name = "GetDonationById")] // Added Name for CreatedAtAction
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(DonationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetDonationById(Guid id)
        {
             _logger.LogInformation("Admin/Editor request: Getting donation by ID: {DonationId}", id);
             try
             {
                 var donation = await _unitOfWork.Context.Donations
                                     .Include(d => d.User) // Include user for mapping
                                     .FirstOrDefaultAsync(d => d.DonationId == id);

                 if (donation == null) return NotFound();

                 var dto = MapToDto(donation); // Use updated MapToDto
                 return Ok(dto);
             }
             catch (Exception ex)
             {
                  _logger.LogError(ex, "Error fetching donation by ID: {DonationId}", id);
                  return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve donation.");
             }
        }


        // --- Helper Method to Map Donation Entity to DTO - UPDATED ---
        private DonationResponseDto MapToDto(Donation donation)
        {
            // Prioritize using included User object, fallback to stored donor fields if User is null
            string? fullName = "Anonymous"; // Default name
            string? email = donation.DonorEmail; // Start with stored email

            if (donation.User != null) // If User was loaded via Include
            {
                fullName = $"{donation.User.FirstName} {donation.User.LastName}".Trim();
                email = donation.User.Email ?? donation.DonorEmail; // Prefer User's email if available
            }
            // If UserId is null, it was truly anonymous, keep Donor fields if set
            else if (donation.UserId == null && (!string.IsNullOrWhiteSpace(donation.DonorFirstName) || !string.IsNullOrWhiteSpace(donation.DonorLastName)))
            {
                 fullName = $"{donation.DonorFirstName} {donation.DonorLastName}".Trim();
                 // email remains donation.DonorEmail
            }
            // If UserId is not null, but User object is null (e.g., deleted user),
            // we might display something like "User (Deleted)" or use stored Donor name/email
            else if (donation.UserId != null && donation.User == null)
            {
                 fullName = $"User ID: {donation.UserId.Substring(0,8)}..."; // Or use stored name?
                 // email remains donation.DonorEmail
            }

            return new DonationResponseDto
            {
                DonationId = donation.DonationId,
                Amount = donation.Amount,
                Method = donation.Method,
                Status = donation.Status,
                DonationDate = donation.DonationDate,
                TransactionId = donation.TransactionId,
                UserId = donation.UserId,
                UserFullName = fullName, // Use derived name
                DonorEmail = email, // Use derived email
                // Keep original anonymous fields null if it was a registered user donation
                DonorFirstName = donation.UserId == null ? donation.DonorFirstName : null,
                DonorLastName = donation.UserId == null ? donation.DonorLastName : null,
                // Add recurring info needed for Admin DTO
                IsRecurring = donation.IsRecurring,
                SubscriptionId = donation.SubscriptionId
            };
        }
    }
}