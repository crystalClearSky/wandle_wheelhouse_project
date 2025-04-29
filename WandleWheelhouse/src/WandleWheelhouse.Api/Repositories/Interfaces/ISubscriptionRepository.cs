using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.Repositories.Interfaces;

public interface ISubscriptionRepository : IGenericRepository<Subscription>
{
    // Example specific methods (can be added later):
    // Task<IEnumerable<Subscription>> GetActiveSubscriptionsByUserAsync(string userId);
    // Task<Subscription?> GetSubscriptionByProviderIdAsync(string providerSubscriptionId);
}