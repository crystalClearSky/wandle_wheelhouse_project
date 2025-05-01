using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims; // Required for User.FindFirstValue
using WandleWheelhouse.Api.DTOs.Donations;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork; // Your IUnitOfWork namespace

namespace WandleWheelhouse.Api.Controllers;

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
    [AllowAnonymous] // Allow anyone to donate, but we'll check if they're logged in
    [ProducesResponseType(typeof(DonationResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ProcessDonation([FromBody] DonationRequestDto donationRequestDto)
    {
        _logger.LogInformation("Processing donation request for Amount: {Amount}, Method: {Method}",
            donationRequestDto.Amount, donationRequestDto.Method);

        User? currentUser = null;
        string? userId = null;

        // Check if the user is authenticated
        if (User.Identity?.IsAuthenticated ?? false)
        {
            userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId != null)
            {
                currentUser = await _userManager.FindByIdAsync(userId);
                if (currentUser == null)
                {
                    // This shouldn't happen if the token is valid, but handle defensively
                    _logger.LogWarning("Authenticated user ID {UserId} not found.", userId);
                    return Unauthorized("User not found.");
                }
                _logger.LogInformation("Donation initiated by logged-in user: {UserId}", userId);
            }
        }
        else
        {
            // Anonymous donation - potentially validate required anonymous fields
            if (string.IsNullOrWhiteSpace(donationRequestDto.DonorEmail))
            {
                return BadRequest("Donor email is required for anonymous donations.");
            }
            _logger.LogInformation("Processing anonymous donation from {Email}", donationRequestDto.DonorEmail);
        }

        // --- Mock Payment Processing ---
        // In a real app, call Worldpay/PayPal service here.
        // For now, simulate success. You could add logic (e.g., fail if amount < 1).
        bool paymentSuccess = await SimulatePaymentAsync(donationRequestDto);
        string mockTransactionId = $"MOCK_{donationRequestDto.Method}_{Guid.NewGuid()}";

        var donation = new Donation
        {
            DonationId = Guid.NewGuid(),
            Amount = donationRequestDto.Amount,
            Method = donationRequestDto.Method,
            Status = paymentSuccess ? PaymentStatus.Success : PaymentStatus.Failed,
            DonationDate = DateTime.UtcNow,
            TransactionId = paymentSuccess ? mockTransactionId : null,
            // Link to user or store anonymous details
            UserId = currentUser?.Id,
            DonorFirstName = currentUser == null ? donationRequestDto.DonorFirstName : currentUser.FirstName,
            DonorLastName = currentUser == null ? donationRequestDto.DonorLastName : currentUser.LastName,
            DonorEmail = currentUser == null ? donationRequestDto.DonorEmail : currentUser.Email,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await _unitOfWork.Donations.AddAsync(donation);
            await _unitOfWork.CompleteAsync(); // Save changes to DB

            if (!paymentSuccess)
            {
                _logger.LogWarning("Simulated payment failed for donation request.");
                // Return BadRequest or Ok with failed status depending on desired UX
                 return Ok(MapToDto(donation)); // Return Ok but with Failed status
            }

            _logger.LogInformation("Donation {DonationId} created successfully. Transaction: {TransactionId}",
                donation.DonationId, donation.TransactionId);

            // Return 201 Created with the created donation details
            var responseDto = MapToDto(donation);
            // Generate URL to the newly created resource (optional but good practice)
            // return CreatedAtAction(nameof(GetDonationById), new { id = donation.DonationId }, responseDto);
            return StatusCode(StatusCodes.Status201Created, responseDto);

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
        // Simulate network delay
        await Task.Delay(TimeSpan.FromMilliseconds(100 + new Random().Next(400)));

        // Simulate success most of the time
        // (Could add logic based on amount, method, etc.)
        bool success = request.Amount >= 1.00m; // Fail donations below 1.00?

        _logger.LogInformation("Simulated payment result for Amount {Amount}: {Result}", request.Amount, success ? "Success" : "Failed");
        return success;
    }


    // --- Endpoint to Get All Donations (Admin/Editor Only) ---
    [HttpGet]
    [Authorize(Roles = "Administrator,Editor")] // Only Admins and Editors can see all donations
    [ProducesResponseType(typeof(IEnumerable<DonationResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllDonations()
    {
        _logger.LogInformation("Admin/Editor request: Getting all donations.");
        var donations = await _unitOfWork.Donations.GetAllAsync(); // Add ordering if needed
        var dtos = donations.Select(MapToDto).ToList();
        return Ok(dtos);
        // TODO: Implement Pagination for large datasets
    }

    // --- Endpoint to Get Donations for Current User ---
    [HttpGet("mine")]
    [Authorize] // Any authenticated user (Member, Editor, Admin) can see their own donations
    [ProducesResponseType(typeof(IEnumerable<DonationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyDonations()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            // Should not happen if [Authorize] is working, but good practice
            return Unauthorized();
        }

        _logger.LogInformation("User {UserId} request: Getting own donations.", userId);

        // Use FindAsync for filtering, or a specific repository method if created
        var donations = await _unitOfWork.Donations.FindAsync(d => d.UserId == userId);
         // Order donations if needed, e.g., by date descending
        var orderedDonations = donations.OrderByDescending(d => d.DonationDate);
        var dtos = orderedDonations.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    // --- Endpoint to Get Specific Donation by ID (Admin/Editor Only) ---
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(DonationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDonationById(Guid id)
    {
         _logger.LogInformation("Admin/Editor request: Getting donation by ID: {DonationId}", id);
        var donation = await _unitOfWork.Donations.GetByIdAsync(id);

        if (donation == null)
        {
            _logger.LogWarning("Donation with ID: {DonationId} not found.", id);
            return NotFound();
        }

        // Optionally: Could add check here if an Editor should only see donations they managed? (More complex)

        var dto = MapToDto(donation);
        return Ok(dto);
    }


    // --- Helper Method to Map Donation Entity to DTO ---
    private DonationResponseDto MapToDto(Donation donation)
    {
        // Manual mapping. Consider using AutoMapper library for larger projects.
        return new DonationResponseDto
        {
            DonationId = donation.DonationId,
            Amount = donation.Amount,
            Method = donation.Method,
            Status = donation.Status,
            DonationDate = donation.DonationDate,
            TransactionId = donation.TransactionId,
            UserId = donation.UserId,
            // Assuming User navigation property might NOT be loaded by default in GetAllAsync/FindAsync
            // We store denormalized names/email in Donation entity itself for this DTO
            UserFullName = donation.UserId != null ? $"{donation.DonorFirstName} {donation.DonorLastName}" : null,
            DonorFirstName = donation.UserId == null ? donation.DonorFirstName : null,
            DonorLastName = donation.UserId == null ? donation.DonorLastName : null,
            DonorEmail = donation.DonorEmail // Store User's email or Anonymous email here
        };
    }
}