using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WandleWheelhouse.Api.Data;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.Repositories.Interfaces;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WandleWheelhouse.Api.Repositories;

#nullable enable

public class BlogArticleRepository : GenericRepository<BlogArticle>, IBlogArticleRepository
{
    public BlogArticleRepository(ApplicationDbContext context) : base(context)
    {
    }

    // --- Implement IBlogArticleRepository specific methods ---

    public async Task<IEnumerable<BlogArticle>> GetPublishedArticlesAsync(int pageNumber, int pageSize)
    {
        // Get a paginated list of articles that are marked as published
        // Include Author details (FirstName, LastName)
        return await _dbSet
            .Where(a => a.IsPublished)
            .Include(a => a.Author) // Include the related User (Author) entity
            .OrderByDescending(a => a.PublicationDate) // Show newest first
            .Skip((pageNumber - 1) * pageSize) // Calculate items to skip for pagination
            .Take(pageSize) // Take only the number of items for the current page
            .ToListAsync();
    }

    public async Task<BlogArticle?> GetPublishedArticleBySlugAsync(string slug)
    {
        // Find a single published article by its URL slug
        // Include Author details
        return await _dbSet
            .Include(a => a.Author)
            .Where(a => a.IsPublished && a.Slug == slug)
            .FirstOrDefaultAsync();
    }

     public async Task<IEnumerable<BlogArticle>> GetArticlesByAuthorAsync(string authorId)
     {
         // Find all articles (published or not) by a specific author's ID
         // Include Author details (though might be redundant if filtering by AuthorId)
         return await _dbSet
             .Include(a => a.Author)
             .Where(a => a.AuthorId == authorId)
             .OrderByDescending(a => a.PublicationDate)
             .ToListAsync();
     }

    // Override GetByIdAsync to include Author details by default when getting a single article
    public override async Task<BlogArticle?> GetByIdAsync(object id)
    {
        if (id is Guid guidId)
        {
            return await _dbSet
                .Include(a => a.Author) // Eagerly load Author
                .FirstOrDefaultAsync(a => a.BlogArticleId == guidId);
        }
        return await base.GetByIdAsync(id);
    }

    // Consider adding a method to get total count of published articles for pagination metadata
    public async Task<int> GetPublishedArticlesCountAsync()
    {
        return await _dbSet.CountAsync(a => a.IsPublished);
    }
}
#nullable disable