using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.DTOs.Donations; // Assuming you might have a DTO for payment intent request
using Stripe;
using System.Collections.Generic;

namespace WandleWheelhouse.Api.Services
{
    public interface IPaymentService
    {
        Task<PaymentIntent> CreateOrUpdatePaymentIntentAsync(decimal amount, string currency, string? existingPaymentIntentId = null, Dictionary<string, string>? metadata = null);
        string GetStripePublishableKey();
        // Subscription methods will be added later
    }
}
