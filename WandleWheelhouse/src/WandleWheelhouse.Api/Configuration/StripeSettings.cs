using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WandleWheelhouse.Api.Configuration
{
    public class StripeSettings
    {
        public string SecretKey { get; set; } = string.Empty;
        public string PublishableKey { get; set; } = string.Empty;
        public string DonationWebhookSecret { get; set; } = string.Empty;
        public string SubscriptionWebhookSecret { get; set; } = string.Empty; // For later
    }
}