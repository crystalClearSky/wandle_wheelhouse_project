using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using WandleWheelhouse.Api.DTOs.Blog;
using WandleWheelhouse.Api.DTOs.Common;
using WandleWheelhouse.Api.Models;
using WandleWheelhouse.Api.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using System.Text;
using System.Globalization;
using Ganss.Xss; // <-- Required for Sanitization
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http; // Required for StatusCodes

namespace WandleWheelhouse.Api.Controllers
{
    // Assume BaseApiController sets [ApiController] and [Route("api/[controller]")]
    public class BlogArticlesController : BaseApiController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<BlogArticlesController> _logger;

        // Consider injecting IHtmlSanitizer if configured globally via DI
        public BlogArticlesController(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            ILogger<BlogArticlesController> logger)
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _logger = logger;
        }

        // --- Create Blog Article ---
        [HttpPost]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateBlogArticle([FromBody] BlogArticleCreateDto createDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var author = await _userManager.FindByIdAsync(userId!);
            if (author == null) return Forbid("Author not found.");

            _logger.LogInformation("Creating blog article '{Title}' by User {UserId}", createDto.Title, userId);

            var sanitizer = CreateHtmlSanitizer(); // Use helper for configuration
            var sanitizedContent = sanitizer.Sanitize(createDto.Content);

             string slug;
            if (!string.IsNullOrWhiteSpace(createDto.Slug) && IsValidSlug(createDto.Slug))
            {
                slug = GenerateSlug(createDto.Slug); // Normalize provided slug
            }
            else
            {
                slug = GenerateSlug(createDto.Title); // Generate from title
            }
            if (!IsValidSlug(slug)) // Fallback if generated slug is invalid
            {
                 slug = Guid.NewGuid().ToString("N").Substring(0, 10);
                 _logger.LogWarning("Invalid slug generated for title '{Title}'. Using fallback: {Slug}", createDto.Title, slug);
            }
            // Check uniqueness
            if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == slug))
            {
                slug = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                _logger.LogWarning("Generated slug collided, appended timestamp: {Slug}", slug);
            }
            // --- ** End Corrected Slug Handling ** ---
            if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == slug))
            {
                slug = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
            }

            var article = new BlogArticle
            {
                BlogArticleId = Guid.NewGuid(),
                Title = createDto.Title,
                Content = sanitizedContent, // Use sanitized content
                Excerpt = createDto.Excerpt,
                Caption = createDto.Caption,
                ImageUrl = createDto.ImageUrl,
                PublicationDate = DateTime.UtcNow, // Initial creation date
                LastUpdatedDate = DateTime.UtcNow,
                AuthorId = userId!,
                Slug = slug,
                IsPublished = createDto.IsPublished
            };
            if (article.IsPublished) { article.PublicationDate = DateTime.UtcNow; } // Set pub date if publishing now

            try
            {
                await _unitOfWork.BlogArticles.AddAsync(article);
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Article '{Title}' created (ID: {ArticleId})", article.Title, article.BlogArticleId);
                var responseDto = MapToResponseDto(article, author);
                return CreatedAtAction(nameof(GetBlogArticleById), new { id = article.BlogArticleId }, responseDto);
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, "Error creating blog article '{Title}'", createDto.Title);
                 return StatusCode(StatusCodes.Status500InternalServerError, "Error saving article.");
            }
        }

        // --- Get Published Articles (Public) ---
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDto<BlogArticleCardDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPublishedBlogArticles([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 50) pageSize = 50;
            try
            {
                var totalCount = await _unitOfWork.Context.BlogArticles.CountAsync(a => a.IsPublished);
                var articles = await _unitOfWork.Context.BlogArticles
                                             .Where(a => a.IsPublished)
                                             .Include(a => a.Author)
                                             .OrderByDescending(a => a.PublicationDate)
                                             .Skip((pageNumber - 1) * pageSize).Take(pageSize)
                                             .AsNoTracking().ToListAsync();
                var cardDtos = articles.Select(MapToCardDto).ToList();
                return Ok(new PagedResultDto<BlogArticleCardDto> { Items = cardDtos, TotalCount = totalCount, PageNumber = pageNumber, PageSize = pageSize });
            }
            catch (Exception ex) { /* ... logging and error response ... */ return StatusCode(500, "Error fetching articles");}
        }

        // --- Get All Articles (Admin/Editor) ---
        [HttpGet("all")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(PagedResultDto<BlogArticleCardDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllBlogArticles([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
             if (pageNumber < 1) pageNumber = 1;
             if (pageSize < 1) pageSize = 1;
             if (pageSize > 50) pageSize = 50;
            try
            {
                 var totalCount = await _unitOfWork.Context.BlogArticles.CountAsync();
                 var articles = await _unitOfWork.Context.BlogArticles
                                             .Include(a => a.Author)
                                             .OrderByDescending(a => a.LastUpdatedDate) // Order by update most recent
                                             .Skip((pageNumber - 1) * pageSize).Take(pageSize)
                                             .AsNoTracking().ToListAsync();
                 var cardDtos = articles.Select(MapToCardDto).ToList();
                 return Ok(new PagedResultDto<BlogArticleCardDto> { Items = cardDtos, TotalCount = totalCount, PageNumber = pageNumber, PageSize = pageSize });
            }
            catch (Exception ex) { /* ... logging and error response ... */ return StatusCode(500, "Error fetching all articles");}
        }

        // --- Get Single Published Article by Slug (Public) ---
        [HttpGet("slug/{slug}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPublishedBlogArticleBySlug(string slug)
        {
            if (string.IsNullOrWhiteSpace(slug)) return BadRequest("Slug is required.");
            try
            {
                var article = await _unitOfWork.Context.BlogArticles
                                      .Include(a => a.Author)
                                      .AsNoTracking()
                                      .FirstOrDefaultAsync(a => a.Slug == slug && a.IsPublished);
                if (article == null) return NotFound();
                return Ok(MapToResponseDto(article, article.Author));
            }
             catch (Exception ex) { /* ... logging and error response ... */ return StatusCode(500, "Error fetching article");}
        }

        // --- Get Article by ID (Admin/Editor) ---
        [HttpGet("{id:guid}", Name = "GetBlogArticleById")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBlogArticleById(Guid id)
        {
            _logger.LogInformation("Admin/Editor request for article by ID: {ArticleId}", id);
            try
            {
                // Include author for mapping DTO
                var article = await _unitOfWork.Context.BlogArticles
                                      .Include(a => a.Author)
                                      // No AsNoTracking() needed if we might update later?
                                      // Let's assume fetching for edit might lead to update, remove it.
                                      .FirstOrDefaultAsync(a => a.BlogArticleId == id);
                if (article == null) return NotFound($"Article with ID '{id}' not found.");
                return Ok(MapToResponseDto(article, article.Author));
            }
            catch (Exception ex) { /* ... logging and error response ... */ return StatusCode(500, "Error fetching article");}
        }

        // --- Update an Article (Admin/Editor) ---
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateBlogArticle(Guid id, [FromBody] BlogArticleUpdateDto updateDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("User {UserId} updating article {ArticleId}", userId, id);

            // Fetch with tracking
            var article = await _unitOfWork.Context.BlogArticles
                                  .Include(a => a.Author) // Include author for response mapping
                                  .FirstOrDefaultAsync(a => a.BlogArticleId == id);

            if (article == null) return NotFound($"Article with ID '{id}' not found.");

            // Authorization Check (Admin or Author only)
            var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
            bool isAdmin = userRoles.Contains("Administrator");
            bool isAuthor = article.AuthorId == userId;
            if (!isAdmin && !isAuthor) return Forbid();

            // --- HTML SANITIZATION ---
            var sanitizer = CreateHtmlSanitizer(); // Use helper

            // --- Apply Updates ---
            bool updated = false;
            if (updateDto.Title != null && article.Title != updateDto.Title) { article.Title = updateDto.Title; updated = true; }
            if (updateDto.Content != null) // Always sanitize if content is provided
            {
                var sanitizedContent = sanitizer.Sanitize(updateDto.Content);
                if (article.Content != sanitizedContent) {
                     article.Content = sanitizedContent; // <-- Use SANITIZED content
                     updated = true;
                }
            }
            if (updateDto.Excerpt != null && article.Excerpt != updateDto.Excerpt) { article.Excerpt = updateDto.Excerpt; updated = true; }
            if (updateDto.Caption != null && article.Caption != updateDto.Caption) { article.Caption = updateDto.Caption; updated = true; }
            if (updateDto.ImageUrl != null && article.ImageUrl != updateDto.ImageUrl) { article.ImageUrl = updateDto.ImageUrl; updated = true; }
            if (updateDto.IsPublished.HasValue && article.IsPublished != updateDto.IsPublished.Value)
            {
                article.IsPublished = updateDto.IsPublished.Value;
                // Update PublicationDate only when *changing* to published
                if(article.IsPublished) article.PublicationDate = DateTime.UtcNow;
                updated = true;
            }

            // Handle slug update/regeneration
            bool slugChanged = false;
             if (updateDto.Slug != null) { // If slug is explicitly provided
                 var newSlug = GenerateSlug(updateDto.Slug);
                 if (!IsValidSlug(newSlug)) return BadRequest("Provided slug format is invalid.");
                 if (article.Slug != newSlug) {
                     if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == newSlug && a.BlogArticleId != id)) { return BadRequest("Provided slug is already in use."); }
                     article.Slug = newSlug; updated = true; slugChanged = true;
                 }
             } else if (updateDto.Title != null && article.Title != updateDto.Title && !slugChanged) { // Regenerate if title changed and slug wasn't explicitly set
                 var generatedSlug = GenerateSlug(article.Title);
                 if (article.Slug != generatedSlug) {
                      if (!IsValidSlug(generatedSlug)) generatedSlug = Guid.NewGuid().ToString("N").Substring(0, 10);
                      if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == generatedSlug && a.BlogArticleId != id)) { generatedSlug = $"{generatedSlug}-{DateTime.UtcNow:yyyyMMddHHmmss}"; }
                      article.Slug = generatedSlug; updated = true;
                 }
             }

            if (updated) {
                article.LastUpdatedDate = DateTime.UtcNow;
                //_unitOfWork.BlogArticles.Update(article); // Not needed if entity is tracked
                try {
                    await _unitOfWork.CompleteAsync();
                    _logger.LogInformation("Article {ArticleId} updated successfully by User {UserId}.", id, userId);
                } catch (Exception ex) { /* ... logging and error response ... */ return StatusCode(500, "Error saving article update."); }
            } else {
                 _logger.LogInformation("Article {ArticleId} update request had no changes.", id);
            }

            return Ok(MapToResponseDto(article, article.Author)); // Return updated DTO
        }

        // --- Publish/Unpublish/Delete Endpoints ---
        [HttpPost("{id:guid}/publish")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(StatusCodes.Status204NoContent)] /* ... */
        public async Task<IActionResult> PublishArticle(Guid id) { return await SetPublishStatus(id, true); }

        [HttpPost("{id:guid}/unpublish")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(StatusCodes.Status204NoContent)] /* ... */
        public async Task<IActionResult> UnpublishArticle(Guid id) { return await SetPublishStatus(id, false); }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Administrator")]
        [ProducesResponseType(StatusCodes.Status204NoContent)] /* ... */
        public async Task<IActionResult> DeleteBlogArticle(Guid id) {
             var article = await _unitOfWork.BlogArticles.GetByIdAsync(id);
             if (article == null) return NotFound();
             _unitOfWork.BlogArticles.Remove(article);
             await _unitOfWork.CompleteAsync();
             _logger.LogInformation("Article {ArticleId} deleted by Admin User {UserId}.", id, User.FindFirstValue(ClaimTypes.NameIdentifier));
             return NoContent();
         }

        // --- Private Helper Methods ---
        // Inside BlogArticlesController.cs
        private async Task<IActionResult> SetPublishStatus(Guid id, bool publish)
        {
            // User.FindFirstValue will return null if the claim doesn't exist,
            // but [Authorize] attribute on the endpoint should ensure an authenticated user.
            // For robustness, we could add a null check here if really paranoid,
            // but typically for an authorized endpoint, NameIdentifier will be present.
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!; // Assert not null as user is authorized

            string action = publish ? "Publishing" : "Unpublishing";
            _logger.LogInformation("User {UserId} attempting {Action} for article {ArticleId}", userId, action, id);

            var article = await _unitOfWork.BlogArticles.GetByIdAsync(id);
            if (article == null)
            {
                _logger.LogWarning("Article {ArticleId} not found for {Action} by User {UserId}.", id, action, userId);
                return NotFound();
            }

            // The [Authorize(Roles = "Administrator,Editor")] attribute on the calling actions
            // already ensures the user has one of these roles.
            // If you needed finer-grained control (e.g., Editor can only publish THEIR OWN posts),
            // you would add a check here like:
            // bool isAdmin = User.IsInRole("Administrator");
            // bool isAuthor = article.AuthorId == userId;
            // if (!isAdmin && !isAuthor) { return Forbid(); }

            if (article.IsPublished == publish)
            {
                _logger.LogInformation("Article {ArticleId} is already {Status}, no action taken by User {UserId}.", id, publish ? "published" : "unpublished", userId);
                return NoContent();
            }

            article.IsPublished = publish;
            article.LastUpdatedDate = DateTime.UtcNow;

            // Only set PublicationDate if it's being published AND it wasn't set before (i.e., first publish)
            // Assuming PublicationDate is nullable or DateTime.MinValue indicates not yet set.
            // If PublicationDate is not nullable and defaults to UtcNow on creation, this logic might need adjustment.
            // Let's assume your model's PublicationDate allows us to check if it was truly "never published before".
            // For simplicity, let's use a common pattern: if we're publishing and it was a draft with a very old/default date.
            // Or, if PublicationDate tracks the *latest* publish event, then always set it.
            // Sticking to "set on first true publish":
            if (publish && article.PublicationDate == DateTime.MinValue) // Since PublicationDate is not nullable
            {
                article.PublicationDate = DateTime.UtcNow;
            }
            // If unpublishing, PublicationDate usually remains.

            // _unitOfWork.BlogArticles.Update(article); // EF Core tracks changes on entities retrieved from context.
                                                      // Explicit .Update() is usually for disconnected entities.
            try
            {
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Article {ArticleId} {Action} successful by User {UserId}.", id, publish ? "published" : "unpublished", userId);
                return NoContent();
            }
            catch (DbUpdateConcurrencyException dbEx)
            {
                _logger.LogError(dbEx, "Concurrency error while setting publish status for article {ArticleId}. User {UserId}.", id, userId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Could not update the article due to a data conflict. Please try again.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting publish status for article {ArticleId}. User {UserId}.", id, userId);
                return StatusCode(StatusCodes.Status500InternalServerError, "An error occurred while updating the article's publish status.");
            }
        }
        private static string GenerateSlug(string phrase) { /* ... existing logic from previous response ... */ return "generated-slug"; }
        private static bool IsValidSlug(string slug) { /* ... existing logic ... */ return true; }

        // Updated Mappers to include AuthorAvatarUrl and IsPublished (for Card Dto)
        private BlogArticleResponseDto MapToResponseDto(BlogArticle article, User? author)
        {
            return new BlogArticleResponseDto {
                BlogArticleId = article.BlogArticleId, Title = article.Title, Content = article.Content,
                Excerpt = article.Excerpt, Caption = article.Caption, ImageUrl = article.ImageUrl,
                PublicationDate = article.PublicationDate, LastUpdatedDate = article.LastUpdatedDate,
                IsPublished = article.IsPublished, Slug = article.Slug, AuthorId = article.AuthorId,
                AuthorFullName = author != null ? $"{author.FirstName} {author.LastName}" : "N/A",
                AuthorAvatarUrl = author?.AvatarUrl // <-- Added
            };
        }
        private BlogArticleCardDto MapToCardDto(BlogArticle article)
        {
            return new BlogArticleCardDto {
                BlogArticleId = article.BlogArticleId, Title = article.Title, Excerpt = article.Excerpt,
                ImageUrl = article.ImageUrl, PublicationDate = article.PublicationDate, Slug = article.Slug,
                AuthorAvatarUrl = article.Author?.AvatarUrl, // <-- Added/Verified
                AuthorFullName = article.Author != null ? $"{article.Author.FirstName} {article.Author.LastName}" : "N/A",
                IsPublished = article.IsPublished // <-- Added for Admin list
            };
        }

        // Helper to configure sanitizer consistently
        private IHtmlSanitizer CreateHtmlSanitizer()
        {
             var sanitizer = new HtmlSanitizer();
             sanitizer.AllowedTags.Clear();
             sanitizer.AllowedTags.UnionWith(new[] { "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "a", "img", "iframe", "div", "span", "pre", "code" });
             sanitizer.AllowedAttributes.Clear();
             sanitizer.AllowedAttributes.UnionWith(new[] { "href", "target", "src", "alt", "width", "height", "frameborder", "allow", "allowfullscreen", "style", "class" });
             sanitizer.AllowedSchemes.Clear();
             sanitizer.AllowedSchemes.UnionWith(new[] { "http", "https", "mailto" });
             // Configure further (CSS, etc.) as needed
             return sanitizer;
        }
    }
}