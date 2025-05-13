// src/WandleWheelhouse.Api/Controllers/ContactInquiriesController.cs
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration; // For admin email
using Microsoft.Extensions.Logging;
using WandleWheelhouse.Api.DTOs.ContactInquiries;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Services; // For IEmailSender
using WandleWheelhouse.Api.UnitOfWork;

namespace WandleWheelhouse.Api.Controllers
{
    public class ContactInquiriesController : BaseApiController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<User> _userManager; // To link logged-in user if applicable
        private readonly IEmailSender _emailSender;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ContactInquiriesController> _logger;

        public ContactInquiriesController(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            IEmailSender emailSender,
            IConfiguration configuration,
            ILogger<ContactInquiriesController> logger)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _emailSender = emailSender;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost] // Route will be /api/contactinquiries
        [AllowAnonymous] // Anyone can submit a contact form
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> SubmitInquiry([FromBody] ContactInquiryRequestDto requestDto)
        {
            _logger.LogInformation("Received contact inquiry from {Email} of type {InquiryType}", requestDto.Email, requestDto.InquiryType);

            if (!requestDto.HasConsented)
            {
                ModelState.AddModelError(nameof(requestDto.HasConsented), "You must consent to be contacted.");
                return BadRequest(new ValidationProblemDetails(ModelState));
            }

            if (!Enum.TryParse<InquiryType>(requestDto.InquiryType, true, out var inquiryTypeEnum))
            {
                ModelState.AddModelError(nameof(requestDto.InquiryType), "Invalid inquiry type specified.");
                return BadRequest(new ValidationProblemDetails(ModelState));
            }

            string? userId = User.Identity?.IsAuthenticated ?? false ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;

            var inquiry = new ContactInquiry
            {
                Type = inquiryTypeEnum,
                Name = requestDto.Name,
                Email = requestDto.Email.Trim().ToLowerInvariant(),
                PhoneNumber = requestDto.PhoneNumber,
                Message = requestDto.Message, // Assume content is plain text, not HTML that needs sanitizing here
                SubmittedAt = DateTime.UtcNow,
                UserId = userId,
                IsArchived = false, // Default for new inquiries
            };

            if (inquiryTypeEnum == InquiryType.TourRequest)
            {
                inquiry.OrganizationName = requestDto.OrganizationName;
                inquiry.TourGroupType = requestDto.TourGroupType;
                inquiry.PreferredTourDate = requestDto.PreferredTourDate;
                inquiry.NumberOfAttendees = requestDto.NumberOfAttendees;
            }

            try
            {
                await _unitOfWork.ContactInquiries.AddAsync(inquiry);
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Contact inquiry from {Email} saved to database with ID {InquiryId}", inquiry.Email, inquiry.ContactInquiryId);

                // Send Email Notification
                var adminEmail = _configuration["AdminNotificationEmail"]; // Configure this in appsettings.json
                if (!string.IsNullOrWhiteSpace(adminEmail))
                {
                    var subject = $"New Contact Inquiry: {inquiry.Type} from {inquiry.Name}";
                    var messageBody = $@"
                        A new contact inquiry has been submitted:
                        -----------------------------------------
                        Name: {inquiry.Name}
                        Email: {inquiry.Email}
                        Phone: {inquiry.PhoneNumber ?? "N/A"}
                        Type: {inquiry.Type}
                        Submitted At: {inquiry.SubmittedAt:yyyy-MM-dd HH:mm} UTC
                        Message:
                        {inquiry.Message}
                    ";

                    if (inquiry.Type == InquiryType.TourRequest)
                    {
                        messageBody += $@"
                        -----------------------------------------
                        Tour Request Details:
                        Organization: {inquiry.OrganizationName ?? "N/A"}
                        Group Type: {inquiry.TourGroupType ?? "N/A"}
                        Preferred Date: {(inquiry.PreferredTourDate.HasValue ? inquiry.PreferredTourDate.Value.ToString("yyyy-MM-dd") : "N/A")}
                        Attendees: {inquiry.NumberOfAttendees?.ToString() ?? "N/A"}
                        ";
                    }
                    messageBody += "\n-----------------------------------------";

                    try
                    {
                        await _emailSender.SendEmailAsync(adminEmail, subject, messageBody); // Send HTML and Plain together
                        _logger.LogInformation("Email notification sent to {AdminEmail} for inquiry {InquiryId}", adminEmail, inquiry.ContactInquiryId);
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, "Failed to send email notification for inquiry {InquiryId}", inquiry.ContactInquiryId);
                        // Don't fail the whole request if email fails, but log it
                    }
                }
                else
                {
                    _logger.LogWarning("AdminNotificationEmail not configured. Email notification for inquiry {InquiryId} skipped.", inquiry.ContactInquiryId);
                }

                return NoContent(); // Or Ok(new { message = "Your inquiry has been submitted successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while saving contact inquiry from {Email}", requestDto.Email);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An error occurred while processing your inquiry." });
            }
        }
    }
}