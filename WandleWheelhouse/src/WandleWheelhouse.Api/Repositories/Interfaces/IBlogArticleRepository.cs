using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WandleWheelhouse.Api.Models;

namespace WandleWheelhouse.Api.Repositories.Interfaces;

public interface IBlogArticleRepository : IGenericRepository<BlogArticle>
{
    // Example specific methods (can be added later):
    // Task<IEnumerable<BlogArticle>> GetPublishedArticlesAsync(int pageNumber, int pageSize);
    // Task<BlogArticle?> GetPublishedArticleBySlugAsync(string slug);
    // Task<IEnumerable<BlogArticle>> GetArticlesByAuthorAsync(string authorId);
}