using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Stripe;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Configuration;
using System.Collections.Generic; // Required for Dictionary


namespace WandleWheelhouse.Api.Services
{
    public class StripePaymentService : IPaymentService
    {
        private readonly StripeSettings _stripeSettings;
        private readonly PaymentIntentService _paymentIntentService; // Stripe's service

        public StripePaymentService(IOptions<StripeSettings> stripeSettings)
        {
            _stripeSettings = stripeSettings.Value;
            StripeConfiguration.ApiKey = _stripeSettings.SecretKey;
            _paymentIntentService = new PaymentIntentService();
        }

        public async Task<PaymentIntent> CreateOrUpdatePaymentIntentAsync(decimal amount, string currency, string? existingPaymentIntentId = null, Dictionary<string, string>? metadata = null)
        {
            var longAmount = (long)(amount * 100); // Stripe expects amount in cents

            if (string.IsNullOrEmpty(existingPaymentIntentId))
            {
                var options = new PaymentIntentCreateOptions
                {
                    Amount = longAmount,
                    Currency = currency.ToLower(),
                    AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions { Enabled = true },
                    Metadata = metadata ?? new Dictionary<string, string>()
                };
                return await _paymentIntentService.CreateAsync(options);
            }
            else
            {
                var options = new PaymentIntentUpdateOptions
                {
                    Amount = longAmount,
                    Metadata = metadata
                };
                return await _paymentIntentService.UpdateAsync(existingPaymentIntentId, options);
            }
        }

        public string GetStripePublishableKey()
        {
            return _stripeSettings.PublishableKey;
        }
    }
}