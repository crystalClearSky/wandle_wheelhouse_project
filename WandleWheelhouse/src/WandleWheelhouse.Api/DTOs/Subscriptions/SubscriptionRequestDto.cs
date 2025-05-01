using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using WandleWheelhouse.Api.Models; // For PaymentMethod enum

namespace WandleWheelhouse.Api.DTOs.Subscriptions;

public class SubscriptionRequestDto
{
    [Required]
    // Validate that the amount is one of the allowed increments (£5, £10, ... £100)
    [RegularExpression(@"^(5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100)$",
        ErrorMessage = "Subscription amount must be a multiple of £5 between £5 and £100.")]
    public decimal MonthlyAmount { get; set; }

    [Required]
    public PaymentMethod Method { get; set; } // Worldpay or PayPal
}