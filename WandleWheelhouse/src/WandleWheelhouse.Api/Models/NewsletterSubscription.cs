using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

    namespace WandleWheelhouse.Api.Models;

    #nullable enable

    public class NewsletterSubscription
    {
        [Key]
        public Guid NewsletterSubscriptionId { get; set; } = Guid.NewGuid();

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public bool ConsentGiven { get; set; } = true; // Assuming signup implies consent

        public DateTime SubscriptionDate { get; set; } = DateTime.UtcNow;

        // Optional: Link to User if they are logged in when subscribing
        public string? UserId { get; set; }
        public virtual User? User { get; set; }
    }
    #nullable disable