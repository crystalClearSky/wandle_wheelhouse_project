using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Repositories.Interfaces;

namespace WandleWheelhouse.Api.UnitOfWork;

public interface IUnitOfWork : IDisposable
{
    // Add properties for each repository
    IDonationRepository Donations { get; }
    ISubscriptionRepository Subscriptions { get; }
    INewsletterSubscriptionRepository NewsletterSubscriptions { get; }
    IBlogArticleRepository BlogArticles { get; }
    // Add other repositories as needed (e.g., IUserRepository if you create one)

    Task<int> CompleteAsync(); // Save changes
}