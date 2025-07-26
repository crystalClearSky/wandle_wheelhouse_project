// Location: src/WandleWheelhouse.Api/Controllers/DonationsController.cs

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims; // Required for User.FindFirstValue
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http; // For StatusCodes
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;       // For EF Core methods like Include, CountAsync, ToListAsync etc.
using Microsoft.Extensions.Logging;        // For ILogger
using Stripe;                              // For StripeException, PaymentIntent
using WandleWheelhouse.Api.DTOs.Common;    // Contains PagedResultDto
using WandleWheelhouse.Api.DTOs.Donations; // Contains DonationRequestDto, DonationResponseDto
using WandleWheelhouse.Api.Models;         // Contains Donation, User, PaymentMethod, PaymentStatus enums
using WandleWheelhouse.Api.Services;       // Contains IPaymentService
using WandleWheelhouse.Api.UnitOfWork;     // Contains IUnitOfWork

namespace WandleWheelhouse.Api.Controllers
{
    // Assume BaseApiController applies [ApiController] and [Route("api/[controller]")]
    public class DonationsController : BaseApiController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<DonationsController> _logger;
        private readonly IPaymentService _paymentService;

        public DonationsController(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            ILogger<DonationsController> logger,
            IPaymentService paymentService)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _logger = logger;
            _paymentService = paymentService;
        }

        // --- Endpoint to Process a New Donation (Your Existing Method - Updated to map billing address) ---
        [HttpPost("process")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(DonationResponseDto), StatusCodes.Status200OK)] // Updated to reflect typical return
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ProcessDonation([FromBody] DonationRequestDto donationRequestDto)
        {
            _logger.LogInformation("Processing non-Stripe donation request - Amount: {Amount}, Method: {Method}",
                donationRequestDto.Amount, donationRequestDto.Method);

            User? currentUser = null;
            string? userId = User.Identity?.IsAuthenticated ?? false ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;

            if (userId != null)
            {
                currentUser = await _userManager.FindByIdAsync(userId);
                if (currentUser == null)
                {
                    _logger.LogWarning("Authenticated user ID {UserId} not found during donation processing.", userId);
                    return Unauthorized(new ProblemDetails { Title = "User session invalid." });
                }
                _logger.LogInformation("Donation initiated by logged-in user: {UserId}", userId);
            }
            else
            {
                if (string.IsNullOrWhiteSpace(donationRequestDto.DonorEmail))
                {
                    return BadRequest(new ProblemDetails { Title = "Donor email is required for anonymous donations." });
                }
                _logger.LogInformation("Processing anonymous donation from {Email}", donationRequestDto.DonorEmail);
            }

            bool paymentSuccess = true; // Default for this flow unless SimulatePaymentAsync changes it
            string? mockTransactionId = null;

            // This method is for non-Stripe methods based on your current /initiate-stripe-donation endpoint
            if (donationRequestDto.Method == WandleWheelhouse.Api.Models.PaymentMethod.Stripe)
            {
                _logger.LogWarning("ProcessDonation endpoint called with Stripe method. Please use /initiate-stripe-donation for Stripe payments.");
                return BadRequest(new ProblemDetails { Title = "Incorrect endpoint for Stripe payments. Use /initiate-stripe-donation." });
            }
            
            paymentSuccess = await SimulatePaymentAsync(donationRequestDto); // For Worldpay/PayPal
            mockTransactionId = paymentSuccess ? $"MOCK_{donationRequestDto.Method}_{Guid.NewGuid()}" : null;

            var donation = new WandleWheelhouse.Api.Models.Donation
            {
                DonationId = Guid.NewGuid(),
                Amount = donationRequestDto.Amount,
                Currency = !string.IsNullOrWhiteSpace(donationRequestDto.Currency) ? donationRequestDto.Currency.ToLower() : "gbp",
                Method = donationRequestDto.Method,
                Status = paymentSuccess ? WandleWheelhouse.Api.Models.PaymentStatus.Success : WandleWheelhouse.Api.Models.PaymentStatus.Failed,
                DonationDate = DateTime.UtcNow,
                TransactionId = mockTransactionId,
                UserId = currentUser?.Id,
                DonorFirstName = currentUser?.FirstName ?? donationRequestDto.DonorFirstName,
                DonorLastName = currentUser?.LastName ?? donationRequestDto.DonorLastName,
                DonorEmail = currentUser?.Email ?? donationRequestDto.DonorEmail,

                // Save billing address for non-Stripe donations too, if provided
                BillingAddressLine1 = donationRequestDto.BillingAddressLine1,
                BillingAddressLine2 = donationRequestDto.BillingAddressLine2,
                BillingCity = donationRequestDto.BillingCity,
                BillingStateOrCounty = donationRequestDto.BillingStateOrCounty,
                BillingPostCode = donationRequestDto.BillingPostCode,
                BillingCountry = donationRequestDto.BillingCountry?.ToUpper(),

                IsRecurring = donationRequestDto.IsRecurring,
                SubscriptionId = donationRequestDto.SubscriptionId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            try
            {
                await _unitOfWork.Donations.AddAsync(donation);
                await _unitOfWork.CompleteAsync();

                if (!paymentSuccess)
                {
                    _logger.LogWarning("Simulated payment failed for {PaymentMethod} donation. Donation record saved with ID {DonationId}", donation.Method, donation.DonationId);
                }
                _logger.LogInformation("Donation {DonationId} for method {PaymentMethod} processed and saved.", donation.DonationId, donation.Method);
                var responseDto = MapToDto(donation);
                return Ok(responseDto);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while saving non-Stripe donation: {ErrorMessage} --- Inner: {InnerErrorMessage}", ex.Message, ex.InnerException?.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An error occurred while processing your donation." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while saving donation.");
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An error occurred while processing your donation." });
            }
        }

        // --- Mock Payment Simulation (Your Existing Method) ---
        private async Task<bool> SimulatePaymentAsync(DonationRequestDto request)
        {
            await Task.Delay(TimeSpan.FromMilliseconds(100 + new Random().Next(300)));
            bool success = request.Amount >= 1.00m;
            _logger.LogInformation("Simulated payment result for Amount {Amount}: {Result}", request.Amount, success ? "Success" : "Failed");
            return success;
        }

        // --- New endpoint to initiate a Stripe donation (Updated with Billing Address) ---
        [HttpPost("initiate-stripe-donation")]
        [Authorize] // Or [AllowAnonymous] and handle user/donor details carefully
        public async Task<IActionResult> InitiateStripeDonation([FromBody] DonationRequestDto donationRequestDto)
        {
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("InitiateStripeDonation: Invalid model state: {ModelStateErrors}", string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(ModelState);
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            User? currentUser = null;
            if (!string.IsNullOrEmpty(userId))
            {
                currentUser = await _userManager.FindByIdAsync(userId);
                // It's good practice to handle if currentUser is null even if [Authorize] is present,
                // though typically it shouldn't happen if the token is valid.
                if (currentUser == null) {
                    _logger.LogWarning("InitiateStripeDonation: Authenticated user ID {UserId} not found.", userId);
                    return Unauthorized(new ProblemDetails {Title = "User not found."});
                }
            }

            if (donationRequestDto.Amount <= 0) // Stripe minimums are actually around 0.30 GBP or 0.50 USD/EUR
            {
                return BadRequest(new ProblemDetails { Title = "Donation amount must be positive and meet minimum requirements (e.g., £0.50)." });
            }
             // For anonymous Stripe donations, email is highly recommended for receipts and linking.
            if (userId == null && string.IsNullOrWhiteSpace(donationRequestDto.DonorEmail))
            {
                _logger.LogWarning("InitiateStripeDonation: DonorEmail is highly recommended for anonymous Stripe donation for receipt purposes.");
                // Not making it a hard requirement here, as Stripe might still process without it,
                // but it's best practice to collect it on the client.
            }

            var donation = new WandleWheelhouse.Api.Models.Donation
            {
                DonationId = Guid.NewGuid(),
                Amount = donationRequestDto.Amount, // Store the display amount (e.g., 10.50 for £10.50)
                Currency = !string.IsNullOrWhiteSpace(donationRequestDto.Currency) ? donationRequestDto.Currency.ToLower() : "gbp",
                Method = WandleWheelhouse.Api.Models.PaymentMethod.Stripe,
                Status = WandleWheelhouse.Api.Models.PaymentStatus.Pending,
                DonationDate = DateTime.UtcNow,
                UserId = userId,
                DonorFirstName = donationRequestDto.DonorFirstName ?? currentUser?.FirstName,
                DonorLastName = donationRequestDto.DonorLastName ?? currentUser?.LastName,
                DonorEmail = donationRequestDto.DonorEmail ?? currentUser?.Email,

                // Map Billing Address from DTO
                BillingAddressLine1 = donationRequestDto.BillingAddressLine1,
                BillingAddressLine2 = donationRequestDto.BillingAddressLine2,
                BillingCity = donationRequestDto.BillingCity,
                BillingStateOrCounty = donationRequestDto.BillingStateOrCounty,
                BillingPostCode = donationRequestDto.BillingPostCode,
                BillingCountry = donationRequestDto.BillingCountry?.ToUpper(), // Stripe expects 2-letter uppercase ISO

                IsRecurring = false, // This endpoint is for one-time Stripe donations
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var metadata = new Dictionary<string, string>
            {
                { "donation_id_internal", donation.DonationId.ToString() },
                { "user_id", userId ?? "anonymous" },
                { "donor_email", donation.DonorEmail ?? "unknown" }
            };

            try
            {
                // The IPaymentService.CreateOrUpdatePaymentIntentAsync should handle amount conversion to cents
                var paymentIntentFromStripe = await _paymentService.CreateOrUpdatePaymentIntentAsync(
                    donation.Amount, // Pass the decimal amount (e.g., 10.50)
                    donation.Currency,
                    null,
                    metadata
                );

                donation.PaymentIntentId = paymentIntentFromStripe.Id;
                donation.StripeActualPaymentStatus = paymentIntentFromStripe.Status;

                await _unitOfWork.Donations.AddAsync(donation);
                await _unitOfWork.CompleteAsync();

                _logger.LogInformation("Stripe Donation {DonationId} initiated with Stripe Payment Intent {PaymentIntentId}", donation.DonationId, donation.PaymentIntentId);

                return Ok(new
                {
                    donationId = donation.DonationId,
                    stripeClientSecret = paymentIntentFromStripe.ClientSecret,
                    publishableKey = _paymentService.GetStripePublishableKey()
                });
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe error while initiating donation: {ErrorMessage}. Stripe Error: {StripeErrorJson}", ex.Message, ex.StripeError?.ToJson());
                return BadRequest(new ProblemDetails { Title = "Payment initiation failed.", Detail = ex.StripeError?.Message ?? ex.Message });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database error while saving initial donation record for Stripe: {ErrorMessage} --- Inner: {InnerErrorMessage}", ex.Message, ex.InnerException?.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An error occurred while processing your donation." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating Stripe donation.");
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An unexpected error occurred." });
            }
        }


        // --- Your existing Get All Donations, Get My Donations, Get Donation By ID ---
        // Ensure they use the updated MapToDto if you want billing address in those responses.

        [HttpGet("all")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(PagedResultDto<DonationResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllDonations([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            _logger.LogInformation("Admin/Editor request for all donations. Page: {Page}, Size: {Size}", pageNumber, pageSize);
            try
            {
                var query = _unitOfWork.Context.Donations
                                         .Include(d => d.User)
                                         .OrderByDescending(d => d.DonationDate);
                var totalCount = await query.CountAsync();
                var donations = await query
                                       .Skip((pageNumber - 1) * pageSize)
                                       .Take(pageSize)
                                       .ToListAsync();
                var donationDtos = donations.Select(MapToDto).ToList();
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
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "Failed to retrieve donations." });
            }
        }

        [HttpGet("mine")]
        [Authorize]
        [ProducesResponseType(typeof(IEnumerable<DonationResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyDonations()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized(new ProblemDetails { Title = "User not authenticated." });

            _logger.LogInformation("User {UserId} request: Getting own donations.", userId);
            try
            {
                var donations = await _unitOfWork.Context.Donations
                                               .Include(d => d.User)
                                               .Where(d => d.UserId == userId)
                                               .OrderByDescending(d => d.DonationDate)
                                               .ToListAsync();
                var dtos = donations.Select(MapToDto).ToList();
                return Ok(dtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching donations for user {UserId}", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "Failed to retrieve your donations." });
            }
        }

        [HttpGet("{id:guid}", Name = "GetDonationById")]
        [Authorize(Roles = "Administrator,Editor")] // Or allow user to get their own
        [ProducesResponseType(typeof(DonationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetDonationById(Guid id)
        {
            // Consider allowing authenticated users to fetch their own donation by ID
            // var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // var isAdminOrEditor = User.IsInRole("Administrator") || User.IsInRole("Editor");

            _logger.LogInformation("Request for donation by ID: {DonationId}", id);
            try
            {
                var donation = await _unitOfWork.Context.Donations
                                               .Include(d => d.User)
                                               .FirstOrDefaultAsync(d => d.DonationId == id);

                if (donation == null)
                {
                    _logger.LogWarning("Donation with ID {DonationId} not found.", id);
                    return NotFound(new ProblemDetails { Title = "Donation not found." });
                }

                // Optional: Add ownership check if not admin/editor
                // if (!isAdminOrEditor && donation.UserId != currentUserId)
                // {
                // _logger.LogWarning("User {UserId} attempted to access unauthorized donation {DonationId}", currentUserId, id);
                // return Forbid();
                // }

                var dto = MapToDto(donation);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching donation by ID: {DonationId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "Failed to retrieve donation." });
            }
        }

        // --- Helper Method to Map Donation Entity to DTO (Updated with Billing Address) ---
        private DonationResponseDto MapToDto(WandleWheelhouse.Api.Models.Donation donation)
        {
            string? fullName = "Anonymous"; // Default
            string? emailToDisplay = donation.DonorEmail; // Fallback to explicitly provided anonymous email

            if (donation.User != null) // If User object is loaded
            {
                fullName = $"{donation.User.FirstName} {donation.User.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(fullName)) fullName = donation.User.UserName; // Fallback to UserName
                emailToDisplay = donation.User.Email ?? donation.DonorEmail; // Prefer authenticated user's email
            }
            // If User object is not loaded but UserId exists (e.g. user deleted or not included)
            // or if it was an anonymous donation with names provided
            else if (!string.IsNullOrWhiteSpace(donation.DonorFirstName) || !string.IsNullOrWhiteSpace(donation.DonorLastName))
            {
                fullName = $"{donation.DonorFirstName} {donation.DonorLastName}".Trim();
            }


            return new DonationResponseDto
            {
                DonationId = donation.DonationId, // Ensure GUID is string
                Amount = donation.Amount,
                Currency = donation.Currency,
                Method = donation.Method,
                Status = donation.Status,
                DonationDate = donation.DonationDate, // ISO 8601 format
                TransactionId = donation.TransactionId,
                PaymentIntentId = donation.PaymentIntentId,
                StripeActualPaymentStatus = donation.StripeActualPaymentStatus,

                UserId = donation.UserId,
                UserFullName = fullName,
                DonorEmail = emailToDisplay, // Use the determined email
                // Only show DonorFirstName/LastName if it was truly anonymous (no UserId)
                DonorFirstName = donation.UserId == null ? donation.DonorFirstName : null,
                DonorLastName = donation.UserId == null ? donation.DonorLastName : null,

                // Billing Address
                BillingAddressLine1 = donation.BillingAddressLine1,
                BillingAddressLine2 = donation.BillingAddressLine2,
                BillingCity = donation.BillingCity,
                BillingStateOrCounty = donation.BillingStateOrCounty,
                BillingPostCode = donation.BillingPostCode,
                BillingCountry = donation.BillingCountry,

                IsRecurring = donation.IsRecurring,
                SubscriptionId = donation.SubscriptionId // Ensure Guid? is string?
            };
        }
    }
}