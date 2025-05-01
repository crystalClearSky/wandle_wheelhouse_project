using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.DTOs.Subscriptions;

#nullable enable
public class SubscriptionResponseDto
{
    public Guid SubscriptionId { get; set; }
    public decimal MonthlyAmount { get; set; }
    public PaymentMethod Method { get; set; }
    public SubscriptionStatus Status { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? NextPaymentDate { get; set; }
    public DateTime? CancellationDate { get; set; }
    public string? ProviderSubscriptionId { get; set; } // ID from PayPal/Worldpay

    // User Info (Consider if needed, adds complexity if User not loaded)
    public string UserId { get; set; } = string.Empty;
    public string? UserFullName { get; set; }
}
#nullable disable