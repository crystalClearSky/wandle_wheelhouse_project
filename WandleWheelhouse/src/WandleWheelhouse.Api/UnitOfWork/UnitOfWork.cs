using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Repositories;
using WandleWheelhouse.Api.Repositories.Interfaces;

namespace WandleWheelhouse.Api.UnitOfWork;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private bool _disposed = false;

    // Lazy load repositories
    private IDonationRepository? _donations;
    private ISubscriptionRepository? _subscriptions;
    private INewsletterSubscriptionRepository? _newsletterSubscriptions;
    private IBlogArticleRepository? _blogArticles;
    private ContactInquiryRepository? _contactInquiries; // <-- Add private field


    public UnitOfWork(ApplicationDbContext context)
    {
        _context = context;
    }

    // Implement repository properties
    public IDonationRepository Donations => _donations ??= new DonationRepository(_context);
    public ISubscriptionRepository Subscriptions => _subscriptions ??= new SubscriptionRepository(_context);
    public INewsletterSubscriptionRepository NewsletterSubscriptions => _newsletterSubscriptions ??= new NewsletterSubscriptionRepository(_context);
    public IBlogArticleRepository BlogArticles => _blogArticles ??= new BlogArticleRepository(_context);
    public IContactInquiryRepository ContactInquiries => _contactInquiries ??= new ContactInquiryRepository(_context); // <-- Initialize property
    // Add:
    public ApplicationDbContext Context => _context;

    
    public async Task<int> CompleteAsync()
    {
        // You could add logic here before saving (e.g., updating timestamps)
        // var entries = _context.ChangeTracker.Entries()
        //     .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);
        // foreach (var entry in entries) { /* update timestamps */ }

        return await _context.SaveChangesAsync();
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!this._disposed)
        {
            if (disposing)
            {
                _context.Dispose();
            }
        }
        this._disposed = true;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}