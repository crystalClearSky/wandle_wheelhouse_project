using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace WandleWheelhouse.Api.DTOs.Newsletter;

#nullable enable
public class NewsletterSubscriptionResponseDto
{
    public Guid NewsletterSubscriptionId { get; set; }
    public string Email { get; set; } = string.Empty;
    public DateTime SubscriptionDate { get; set; }
    public string? UserId { get; set; } // Included if they were logged in when subscribing
}
#nullable disable