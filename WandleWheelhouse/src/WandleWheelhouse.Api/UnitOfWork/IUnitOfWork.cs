using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Repositories.Interfaces;

namespace WandleWheelhouse.Api.UnitOfWork;

public interface IUnitOfWork : IDisposable
{
    // Add properties for each repository
    IDonationRepository Donations { get; }
    ISubscriptionRepository Subscriptions { get; }
    INewsletterSubscriptionRepository NewsletterSubscriptions { get; }
    IBlogArticleRepository BlogArticles { get; }
    IContactInquiryRepository ContactInquiries { get; } // <-- ADD THIS LINE
    // Add other repositories as needed (e.g., IUserRepository if you create one)
    // Add:
    ApplicationDbContext Context { get; }
    Task<int> CompleteAsync(); // Save changes
}