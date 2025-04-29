using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Repositories.Interfaces;
using System.Threading.Tasks;

namespace WandleWheelhouse.Api.Repositories;

#nullable enable

public class NewsletterSubscriptionRepository : GenericRepository<NewsletterSubscription>, INewsletterSubscriptionRepository
{
    public NewsletterSubscriptionRepository(ApplicationDbContext context) : base(context)
    {
    }

    // --- Implement INewsletterSubscriptionRepository specific methods ---

    public async Task<bool> DoesEmailExistAsync(string email)
    {
        // Efficiently check if an email is already subscribed using AnyAsync
        // Normalize email comparison (e.g., to lower case) for case-insensitivity
        string normalizedEmail = email.ToLowerInvariant();
        return await _dbSet.AnyAsync(ns => ns.Email.ToLower() == normalizedEmail);
    }

    public async Task<NewsletterSubscription?> GetSubscriptionByEmailAsync(string email)
    {
        // Find a subscription by email address, case-insensitive
        string normalizedEmail = email.ToLowerInvariant();
        return await _dbSet
            .FirstOrDefaultAsync(ns => ns.Email.ToLower() == normalizedEmail);
    }

    // Example: Find subscription by User ID if they were logged in
    public async Task<NewsletterSubscription?> GetSubscriptionByUserIdAsync(string userId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(ns => ns.UserId == userId);
    }
}
#nullable disable