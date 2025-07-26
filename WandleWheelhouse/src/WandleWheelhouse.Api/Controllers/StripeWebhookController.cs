using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.IO;
using System.Threading.Tasks;
using Stripe;
using WandleWheelhouse.Api.Configuration;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork;

namespace WandleWheelhouse.Api.Controllers
{
    [Route("api/stripe-webhooks")]
    [ApiController]
    public class StripeWebhookController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly StripeSettings _stripeSettings;
        private readonly ILogger<StripeWebhookController> _logger;

        // Define event type constants
        private const string PaymentIntentCreated = "payment_intent.created";
        private const string PaymentIntentSucceeded = "payment_intent.succeeded";
        private const string PaymentIntentPaymentFailed = "payment_intent.payment_failed";
        private const string PaymentIntentProcessing = "payment_intent.processing";
        private const string PaymentIntentCanceled = "payment_intent.canceled";

        public StripeWebhookController(
            IUnitOfWork unitOfWork,
            IOptions<StripeSettings> stripeSettings,
            ILogger<StripeWebhookController> logger)
        {
            _unitOfWork = unitOfWork;
            _stripeSettings = stripeSettings.Value;
            _logger = logger;
        }

        [HttpPost("donations")]
        public async Task<IActionResult> DonationWebhookHandler()
        {
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            // --- BEGIN DEBUG LOGGING ---
            _logger.LogInformation("Stripe Webhook - Incoming Request Headers:");
            foreach (var header in Request.Headers)
            {
                _logger.LogInformation("Header: {HeaderKey}: {HeaderValue}", header.Key, header.Value);
            }
            // --- END DEBUG LOGGING ---
            try
            {
                var stripeEvent = EventUtility.ConstructEvent(json,
                    Request.Headers["Stripe-Signature"],
                    _stripeSettings.DonationWebhookSecret);

                _logger.LogInformation("Stripe Webhook Received - Event Type: {EventType}, Event ID: {EventId}", stripeEvent.Type, stripeEvent.Id);

                PaymentIntent paymentIntent;

                switch (stripeEvent.Type)
                {
                    case PaymentIntentCreated:
                        paymentIntent = (PaymentIntent)stripeEvent.Data.Object;
                        _logger.LogInformation("PaymentIntent Created for PI ID: {PaymentIntentId}. Donation Database ID from metadata: {DonationIdInternal}",
                            paymentIntent.Id,
                            paymentIntent.Metadata.TryGetValue("donation_id_internal", out var createDonId) ? createDonId : "N/A");
                        // Optionally verify donation exists, but no update needed since donation is created elsewhere
                        break;

                    case PaymentIntentSucceeded:
                        paymentIntent = (PaymentIntent)stripeEvent.Data.Object;
                        _logger.LogInformation("PaymentIntent Succeeded for PI ID: {PaymentIntentId}. Donation Database ID from metadata: {DonationIdInternal}",
                            paymentIntent.Id,
                            paymentIntent.Metadata.TryGetValue("donation_id_internal", out var donId) ? donId : "N/A");
                        await HandlePaymentIntentSucceeded(paymentIntent);
                        break;

                    case PaymentIntentPaymentFailed:
                        paymentIntent = (PaymentIntent)stripeEvent.Data.Object;
                        _logger.LogWarning("PaymentIntent Failed for PI ID: {PaymentIntentId}. Reason: {FailureMessage}. Donation Database ID from metadata: {DonationIdInternal}",
                            paymentIntent.Id,
                            paymentIntent.LastPaymentError?.Message,
                            paymentIntent.Metadata.TryGetValue("donation_id_internal", out var failDonId) ? failDonId : "N/A");
                        await HandlePaymentIntentFailed(paymentIntent);
                        break;

                    case PaymentIntentProcessing:
                        paymentIntent = (PaymentIntent)stripeEvent.Data.Object;
                        _logger.LogInformation("PaymentIntent Processing for PI ID: {PaymentIntentId}. Donation Database ID from metadata: {DonationIdInternal}",
                           paymentIntent.Id,
                           paymentIntent.Metadata.TryGetValue("donation_id_internal", out var procDonId) ? procDonId : "N/A");
                        await HandlePaymentIntentProcessing(paymentIntent);
                        break;

                    case PaymentIntentCanceled:
                        paymentIntent = (PaymentIntent)stripeEvent.Data.Object;
                        _logger.LogInformation("PaymentIntent Canceled for PI ID: {PaymentIntentId}. Donation Database ID from metadata: {DonationIdInternal}",
                            paymentIntent.Id,
                            paymentIntent.Metadata.TryGetValue("donation_id_internal", out var cancDonId) ? cancDonId : "N/A");
                        await HandlePaymentIntentCanceled(paymentIntent);
                        break;

                    default:
                        _logger.LogWarning("Unhandled Stripe event type: {EventType}. Event ID: {EventId}, Data: {EventData}",
                            stripeEvent.Type, stripeEvent.Id, stripeEvent.Data?.ToJson() ?? "N/A");
                        break;
                }

                return Ok();
            }
            catch (StripeException e)
            {
                _logger.LogError(e, "Stripe Webhook Error: {ErrorMessage}. Stripe Error Json: {StripeErrorJson}. Request Headers: {Headers}",
                    e.Message,
                    e.StripeError?.ToJson(),
                    Request.Headers);
                return BadRequest(new ProblemDetails { Title = "Webhook signature verification failed or other Stripe error.", Detail = e.Message });
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Generic Webhook Error during event processing. Request Body: {RequestBodyJson}", json);
                return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails { Title = "An internal server error occurred during webhook processing." });
            }
        }

        private async Task HandlePaymentIntentSucceeded(PaymentIntent paymentIntent)
        {
            var donation = await _unitOfWork.Donations.GetByPaymentIntentIdAsync(paymentIntent.Id);
            if (donation == null && paymentIntent.Metadata.TryGetValue("donation_id_internal", out var donationIdInternalStr) && Guid.TryParse(donationIdInternalStr, out var donationIdInternal))
            {
                donation = await _unitOfWork.Donations.GetByIdAsync(donationIdInternal);
            }

            if (donation != null)
            {
                if (donation.Status != PaymentStatus.Success)
                {
                    donation.Status = PaymentStatus.Success;
                    donation.TransactionId = paymentIntent.Id;
                    donation.StripeActualPaymentStatus = paymentIntent.Status;
                    donation.UpdatedAt = DateTime.UtcNow;
                    await _unitOfWork.CompleteAsync();
                    _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) status updated to Success via webhook.", donation.DonationId, paymentIntent.Id);
                }
                else
                {
                    _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) already marked as Success. Webhook Succeeded event ignored.", donation.DonationId, paymentIntent.Id);
                }
            }
            else
            {
                _logger.LogWarning("Webhook HandlePaymentIntentSucceeded: Donation not found for PaymentIntentId {PaymentIntentId} or via metadata 'donation_id_internal'.", paymentIntent.Id);
            }
        }

        private async Task HandlePaymentIntentFailed(PaymentIntent paymentIntent)
        {
            var donation = await _unitOfWork.Donations.GetByPaymentIntentIdAsync(paymentIntent.Id);
            if (donation == null && paymentIntent.Metadata.TryGetValue("donation_id_internal", out var donationIdInternalStr) && Guid.TryParse(donationIdInternalStr, out var donationIdInternal))
            {
                donation = await _unitOfWork.Donations.GetByIdAsync(donationIdInternal);
            }

            if (donation != null)
            {
                if (donation.Status != PaymentStatus.Failed && donation.Status != PaymentStatus.Success)
                {
                    donation.Status = PaymentStatus.Failed;
                    donation.StripeActualPaymentStatus = paymentIntent.Status;
                    donation.UpdatedAt = DateTime.UtcNow;
                    await _unitOfWork.CompleteAsync();
                    _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) status updated to Failed via webhook. Stripe Status: {StripePaymentStatus}", donation.DonationId, paymentIntent.Id, paymentIntent.Status);
                }
                else
                {
                    _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) already in a terminal state ({CurrentStatus}). Failed webhook event ignored.", donation.DonationId, paymentIntent.Id, donation.Status);
                }
            }
            else
            {
                _logger.LogWarning("Webhook HandlePaymentIntentFailed: Donation not found for PaymentIntentId {PaymentIntentId} or via metadata 'donation_id_internal'.", paymentIntent.Id);
            }
        }

        private async Task HandlePaymentIntentProcessing(PaymentIntent paymentIntent)
        {
            var donation = await _unitOfWork.Donations.GetByPaymentIntentIdAsync(paymentIntent.Id);
            if (donation == null && paymentIntent.Metadata.TryGetValue("donation_id_internal", out var donationIdInternalStr) && Guid.TryParse(donationIdInternalStr, out var donationIdInternal))
            {
                donation = await _unitOfWork.Donations.GetByIdAsync(donationIdInternal);
            }

            if (donation != null && donation.Status == PaymentStatus.Pending)
            {
                donation.StripeActualPaymentStatus = paymentIntent.Status;
                donation.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) is Processing. Stripe Status: {StripePaymentStatus}", donation.DonationId, paymentIntent.Id, paymentIntent.Status);
            }
        }

        private async Task HandlePaymentIntentCanceled(PaymentIntent paymentIntent)
        {
            var donation = await _unitOfWork.Donations.GetByPaymentIntentIdAsync(paymentIntent.Id);
            if (donation == null && paymentIntent.Metadata.TryGetValue("donation_id_internal", out var donationIdInternalStr) && Guid.TryParse(donationIdInternalStr, out var donationIdInternal))
            {
                donation = await _unitOfWork.Donations.GetByIdAsync(donationIdInternal);
            }

            if (donation != null)
            {
                if (donation.Status != PaymentStatus.Success && donation.Status != PaymentStatus.Failed)
                {
                    donation.Status = PaymentStatus.Failed;
                    donation.StripeActualPaymentStatus = paymentIntent.Status;
                    donation.UpdatedAt = DateTime.UtcNow;
                    await _unitOfWork.CompleteAsync();
                    _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) status updated to Canceled/Failed via webhook. Stripe Status: {StripePaymentStatus}", donation.DonationId, paymentIntent.Id, paymentIntent.Status);
                }
                else
                {
                    _logger.LogInformation("Donation {DonationId} (Stripe PI: {PaymentIntentId}) already in a terminal state ({CurrentStatus}). Canceled webhook event leads to no change or is handled as Failed.", donation.DonationId, paymentIntent.Id, donation.Status);
                }
            }
            else
            {
                _logger.LogWarning("Webhook HandlePaymentIntentCanceled: Donation not found for PaymentIntentId {PaymentIntentId} or via metadata 'donation_id_internal'.", paymentIntent.Id);
            }
        }
    }
}