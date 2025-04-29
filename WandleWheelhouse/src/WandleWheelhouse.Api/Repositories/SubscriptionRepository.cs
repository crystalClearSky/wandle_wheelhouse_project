using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Repositories.Interfaces;

namespace WandleWheelhouse.Api.Repositories;

#nullable enable

public class SubscriptionRepository : GenericRepository<Subscription>, ISubscriptionRepository
{
    public SubscriptionRepository(ApplicationDbContext context) : base(context)
    {
        // The base constructor already initializes _context and _dbSet
    }

    // --- Implement ISubscriptionRepository specific methods ---

    public async Task<IEnumerable<Subscription>> GetActiveSubscriptionsByUserAsync(string userId)
    {
        // Example implementation: Find subscriptions for a user that are currently active
        return await _dbSet
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active)
            .OrderByDescending(s => s.StartDate) // Show newest first
            .ToListAsync();
    }

    public async Task<Subscription?> GetSubscriptionByProviderIdAsync(string providerSubscriptionId)
    {
        // Example implementation: Find a subscription using the ID from PayPal/Worldpay etc.
        return await _dbSet
            .FirstOrDefaultAsync(s => s.ProviderSubscriptionId == providerSubscriptionId);
    }

    // You can override base methods if needed, for example, to include related data:
    public override async Task<Subscription?> GetByIdAsync(object id)
    {
        if (id is Guid guidId)
        {
            // Example: Include the User navigation property when fetching by ID
            return await _dbSet
                .Include(s => s.User) // Eagerly load the User details
                .FirstOrDefaultAsync(s => s.SubscriptionId == guidId);
        }
        return await base.GetByIdAsync(id); // Fallback or handle non-GUID IDs if necessary
    }
}
#nullable disable