using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.Repositories.Interfaces;

public interface INewsletterSubscriptionRepository : IGenericRepository<NewsletterSubscription>
{
    // Example specific methods (can be added later):
    Task<bool> DoesEmailExistAsync(string email); // Useful check before adding
    // Task<NewsletterSubscription?> GetSubscriptionByEmailAsync(string email);
}