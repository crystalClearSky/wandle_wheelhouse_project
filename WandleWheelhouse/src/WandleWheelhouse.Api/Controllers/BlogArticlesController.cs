using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using WandleWheelhouse.Api.DTOs.Blog;
using WandleWheelhouse.Api.DTOs.Common; // For PagedResultDto
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork;
using Microsoft.EntityFrameworkCore; // For Include/CountAsync if needed
using System.Text.RegularExpressions; // For Slugify
using System.Text; // For Slugify
using System.Globalization; // For Slugify

namespace WandleWheelhouse.Api.Controllers;

public class BlogArticlesController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<User> _userManager;
    private readonly ILogger<BlogArticlesController> _logger;

    public BlogArticlesController(
        IUnitOfWork unitOfWork,
        UserManager<User> userManager,
        ILogger<BlogArticlesController> logger)
    {
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _logger = logger;
    }

    // --- Endpoint to Create a New Blog Article (Admin/Editor Only) ---
    [HttpPost]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateBlogArticle([FromBody] BlogArticleCreateDto createDto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var author = await _userManager.FindByIdAsync(userId);
        if (author == null) return Forbid("Author not found."); // Should not happen if token valid

        _logger.LogInformation("User {UserId} creating blog article titled: {Title}", userId, createDto.Title);

        // Handle Slug: Generate from title if not provided or invalid
        string slug = createDto.Slug ?? GenerateSlug(createDto.Title);
        if (string.IsNullOrWhiteSpace(slug) || !IsValidSlug(slug))
        {
            slug = GenerateSlug(createDto.Title);
        }
        // Ensure slug uniqueness (basic check, might need retry logic for collisions)
        if (await _unitOfWork.BlogArticles.ExistsAsync(a => a.Slug == slug))
        {
            // Append date or random chars for uniqueness if collision occurs
            slug = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
            _logger.LogWarning("Generated slug collided, appended timestamp: {Slug}", slug);
            // Consider more robust unique slug generation if needed
        }


        var article = new BlogArticle
        {
            BlogArticleId = Guid.NewGuid(),
            Title = createDto.Title,
            Content = createDto.Content,
            Excerpt = createDto.Excerpt,
            Caption = createDto.Caption,
            ImageUrl = createDto.ImageUrl,
            PublicationDate = DateTime.UtcNow, // Set on creation, can be updated on publish
            LastUpdatedDate = DateTime.UtcNow,
            AuthorId = userId,
            Slug = slug,
            IsPublished = createDto.IsPublished // Allow setting initial state
            // Author navigation property is null here
        };

        // If publishing immediately, update PublicationDate again? Or keep creation date?
        if (article.IsPublished)
        {
            article.PublicationDate = DateTime.UtcNow;
        }


        try
        {
            await _unitOfWork.BlogArticles.AddAsync(article);
            await _unitOfWork.CompleteAsync();
            _logger.LogInformation("Blog article '{Title}' (ID: {ArticleId}) created successfully by User {UserId}.", article.Title, article.BlogArticleId, userId);

            // Map and return the full article DTO
            var responseDto = MapToResponseDto(article, author); // Pass author for mapping
                                                                 // Return 201 Created with location header pointing to the new resource
            return CreatedAtAction(nameof(GetBlogArticleById), new { id = article.BlogArticleId }, responseDto);
            // Note: GetBlogArticleById needs to be implemented for CreatedAtAction to work fully

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating blog article '{Title}' by User {UserId}.", createDto.Title, userId);
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create blog article.");
        }
    }

    // --- Endpoint to Get Published Blog Articles (Public, Paginated) ---
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedResultDto<BlogArticleCardDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPublishedBlogArticles([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 50) pageSize = 50; // Max page size limit

        _logger.LogInformation("Request for published blog articles. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);

        // Use specific repository method if available or use context Include directly
        // Need total count for pagination *before* skipping/taking items
        var totalCount = await _unitOfWork.Context.BlogArticles
                                        .CountAsync(a => a.IsPublished);

        var articles = await _unitOfWork.Context.BlogArticles
                                        .Where(a => a.IsPublished)
                                        .Include(a => a.Author) // Include author for DTO mapping
                                        .OrderByDescending(a => a.PublicationDate)
                                        .Skip((pageNumber - 1) * pageSize)
                                        .Take(pageSize)
                                        .ToListAsync();

        var cardDtos = articles.Select(MapToCardDto).ToList();

        var pagedResult = new PagedResultDto<BlogArticleCardDto>
        {
            Items = cardDtos,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        return Ok(pagedResult);
    }

    // --- Endpoint to Get All Articles (Admin/Editor, Paginated) ---
    [HttpGet("all")]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(PagedResultDto<BlogArticleCardDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllBlogArticles([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 50) pageSize = 50;

        _logger.LogInformation("Admin/Editor request for ALL blog articles. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);

        var totalCount = await _unitOfWork.Context.BlogArticles.CountAsync();

        var articles = await _unitOfWork.Context.BlogArticles
                                        .Include(a => a.Author)
                                        .OrderByDescending(a => a.PublicationDate)
                                        .Skip((pageNumber - 1) * pageSize)
                                        .Take(pageSize)
                                        .ToListAsync();

        // Use Card DTO for list view, even for admins
        var cardDtos = articles.Select(MapToCardDto).ToList();

        var pagedResult = new PagedResultDto<BlogArticleCardDto>
        {
            Items = cardDtos,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        return Ok(pagedResult);
    }


    // --- Endpoint to Get Single Published Article by Slug (Public) ---
    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublishedBlogArticleBySlug(string slug)
    {
        _logger.LogInformation("Request for published article by slug: {Slug}", slug);
        // Use specific repo method or context directly
        var article = await _unitOfWork.Context.BlogArticles
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Slug == slug && a.IsPublished);

        if (article == null)
        {
            _logger.LogWarning("Published article with slug '{Slug}' not found.", slug);
            return NotFound();
        }

        var dto = MapToResponseDto(article, article.Author);
        return Ok(dto);
    }

    // --- Endpoint to Get Article by ID (Admin/Editor) ---
    // We need this for the CreatedAtAction in the POST endpoint
    [HttpGet("{id:guid}", Name = "GetBlogArticleById")] // Add Name route parameter
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlogArticleById(Guid id)
    {
        _logger.LogInformation("Admin/Editor request for article by ID: {ArticleId}", id);
        var article = await _unitOfWork.Context.BlogArticles
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.BlogArticleId == id);

        if (article == null)
        {
            _logger.LogWarning("Article with ID '{ArticleId}' not found.", id);
            return NotFound();
        }
        var dto = MapToResponseDto(article, article.Author);
        return Ok(dto);
    }


    // --- Endpoint to Update an Article (Admin/Editor) ---
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBlogArticle(Guid id, [FromBody] BlogArticleUpdateDto updateDto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        _logger.LogInformation("User {UserId} updating article {ArticleId}", userId, id);

        var article = await _unitOfWork.BlogArticles.GetByIdAsync(id); // Basic fetch
        if (article == null)
        {
            _logger.LogWarning("Update failed: Article {ArticleId} not found.", id);
            return NotFound();
        }

        // Authorization Check: Allow Admins OR the original Editor author to update
        var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
        bool isAdmin = userRoles.Contains("Administrator");
        bool isAuthor = article.AuthorId == userId;
        bool isEditor = userRoles.Contains("Editor"); // Allow any editor? Or just author? Let's allow Admins or the Author (who must also be an Editor implicitly)

        if (!isAdmin && !(isAuthor && isEditor)) // Only Admin OR the original Author (who must be editor) can edit
        {
            _logger.LogWarning("Update forbidden: User {UserId} is not Admin or Author/Editor for article {ArticleId}.", userId, id);
            return Forbid();
        }

        // --- Apply Updates ---
        bool updated = false;
        if (updateDto.Title != null && article.Title != updateDto.Title)
        {
            article.Title = updateDto.Title;
            updated = true;
            // Consider regenerating slug if title changes? Only if slug not explicitly provided?
            if (string.IsNullOrWhiteSpace(updateDto.Slug))
            {
                article.Slug = GenerateSlug(article.Title);
                // Need to re-check slug uniqueness if regenerating
                if (await _unitOfWork.BlogArticles.ExistsAsync(a => a.Slug == article.Slug && a.BlogArticleId != id))
                {
                    article.Slug = $"{article.Slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                }
            }
        }
        if (updateDto.Content != null && article.Content != updateDto.Content) { article.Content = updateDto.Content; updated = true; }
        if (updateDto.Excerpt != null && article.Excerpt != updateDto.Excerpt) { article.Excerpt = updateDto.Excerpt; updated = true; }
        if (updateDto.Caption != null && article.Caption != updateDto.Caption) { article.Caption = updateDto.Caption; updated = true; }
        if (updateDto.ImageUrl != null && article.ImageUrl != updateDto.ImageUrl) { article.ImageUrl = updateDto.ImageUrl; updated = true; }
        if (updateDto.Slug != null && IsValidSlug(updateDto.Slug) && article.Slug != updateDto.Slug)
        {
            // Check uniqueness before applying explicit slug change
            if (await _unitOfWork.BlogArticles.ExistsAsync(a => a.Slug == updateDto.Slug && a.BlogArticleId != id))
            {
                return BadRequest("Provided slug is already in use.");
            }
            article.Slug = updateDto.Slug;
            updated = true;
        }

        if (updated)
        {
            article.LastUpdatedDate = DateTime.UtcNow;
            _unitOfWork.BlogArticles.Update(article); // Mark as modified
            await _unitOfWork.CompleteAsync();
            _logger.LogInformation("Article {ArticleId} updated successfully by User {UserId}.", id, userId);
        }
        else
        {
            _logger.LogInformation("Article {ArticleId} update request had no changes.", id);
        }

        // Fetch again with author to return updated DTO
        var updatedArticle = await _unitOfWork.Context.BlogArticles
                                        .Include(a => a.Author)
                                        .FirstOrDefaultAsync(a => a.BlogArticleId == id);

        return Ok(MapToResponseDto(updatedArticle!, updatedArticle?.Author)); // Use updated article
    }

    // --- Endpoint to Publish an Article (Admin/Editor) ---
    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PublishArticle(Guid id)
    {
        return await SetPublishStatus(id, true);
    }

    // --- Endpoint to Unpublish an Article (Admin/Editor) ---
    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Roles = "Administrator,Editor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnpublishArticle(Guid id)
    {
        return await SetPublishStatus(id, false);
    }

    // Helper method for publish/unpublish
    private async Task<IActionResult> SetPublishStatus(Guid id, bool publish)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        string action = publish ? "Publishing" : "Unpublishing";
        _logger.LogInformation("User {UserId} attempting {Action} for article {ArticleId}", userId, action, id);

        var article = await _unitOfWork.BlogArticles.GetByIdAsync(id);
        if (article == null) return NotFound();

        // Authorization: Allow Admins or the Author (who must be editor)
        var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
        bool isAdmin = userRoles.Contains("Administrator");
        bool isAuthor = article.AuthorId == userId;
        bool isEditor = userRoles.Contains("Editor");

        if (!isAdmin && !(isAuthor && isEditor)) return Forbid();

        if (article.IsPublished == publish)
        {
            _logger.LogInformation("Article {ArticleId} is already {Status}, no action taken.", id, publish ? "published" : "unpublished");
            return NoContent(); // Or BadRequest("Already in desired state")
        }

        article.IsPublished = publish;
        article.LastUpdatedDate = DateTime.UtcNow;
        // Set PublicationDate only when publishing for the first time? Or update always?
        // Let's set it when publishing, doesn't matter if already set.
        if (publish)
        {
            article.PublicationDate = DateTime.UtcNow;
        }

        _unitOfWork.BlogArticles.Update(article);
        await _unitOfWork.CompleteAsync();
        _logger.LogInformation("Article {ArticleId} {Action} successful by User {UserId}.", id, publish ? "published" : "unpublished", userId);

        return NoContent();
    }


    // --- Endpoint to Delete an Article (Admin Only) ---
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Administrator")] // Only Admins can delete
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBlogArticle(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); // Log who deleted it
        _logger.LogInformation("Admin User {UserId} attempting deletion of article {ArticleId}", userId, id);

        var article = await _unitOfWork.BlogArticles.GetByIdAsync(id);
        if (article == null)
        {
            _logger.LogWarning("Deletion failed: Article {ArticleId} not found.", id);
            return NotFound();
        }

        _unitOfWork.BlogArticles.Remove(article);
        await _unitOfWork.CompleteAsync();
        _logger.LogInformation("Article {ArticleId} deleted successfully by Admin User {UserId}.", id, userId);

        return NoContent();
    }


    // --- Helper Methods ---

    // Basic Slug Generation (Consider a more robust library for complex needs)
    private static string GenerateSlug(string phrase)
    {
        if (string.IsNullOrWhiteSpace(phrase)) return Guid.NewGuid().ToString("N").Substring(0, 8); // fallback slug

        string str = phrase.ToLowerInvariant();
        // Remove invalid chars
        str = Regex.Replace(str, @"[^a-z0-9\s-]", "");
        // Convert multiple spaces/hyphens into one hyphen
        str = Regex.Replace(str, @"[\s-]+", " ").Trim();
        // Replace spaces with hyphens
        str = Regex.Replace(str, @"\s", "-");
        // Remove leading/trailing hyphens
        str = str.Trim('-');
        // Limit length (optional)
        str = str.Length > 100 ? str.Substring(0, 100) : str;

        // Handle cases where the string becomes empty after cleaning
        if (string.IsNullOrWhiteSpace(str)) return Guid.NewGuid().ToString("N").Substring(0, 8); // fallback

        return str;
    }

    private static bool IsValidSlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return false;
        // Check against regex used in DTO validation
        return Regex.IsMatch(slug, @"^[a-z0-9]+(?:-[a-z0-9]+)*$");
    }

    // Helper method to check existence using context (replace with repo method if preferred)
    private async Task<bool> AnyAsync(System.Linq.Expressions.Expression<Func<BlogArticle, bool>> predicate)
    {
        // Requires access to DbContext, e.g., via _unitOfWork.Context
        return await _unitOfWork.Context.BlogArticles.AnyAsync(predicate);
    }

    // Map Entity to Full Response DTO
    private BlogArticleResponseDto MapToResponseDto(BlogArticle article, User? author)
    {
        return new BlogArticleResponseDto
        {
            BlogArticleId = article.BlogArticleId,
            Title = article.Title,
            Content = article.Content, // Include full content
            Excerpt = article.Excerpt,
            Caption = article.Caption,
            ImageUrl = article.ImageUrl,
            PublicationDate = article.PublicationDate,
            LastUpdatedDate = article.LastUpdatedDate,
            IsPublished = article.IsPublished,
            Slug = article.Slug,
            AuthorId = article.AuthorId,
            AuthorFullName = author != null ? $"{author.FirstName} {author.LastName}" : "Unknown Author"
        };
    }

    // Map Entity to Card DTO (for lists)
    private BlogArticleCardDto MapToCardDto(BlogArticle article)
    {
        return new BlogArticleCardDto
        {
            BlogArticleId = article.BlogArticleId,
            Title = article.Title,
            Excerpt = article.Excerpt,
            ImageUrl = article.ImageUrl,
            PublicationDate = article.PublicationDate,
            Slug = article.Slug,
            AuthorFullName = article.Author != null ? $"{article.Author.FirstName} {article.Author.LastName}" : "Unknown Author" // Assumes Author included
        };
    }
}