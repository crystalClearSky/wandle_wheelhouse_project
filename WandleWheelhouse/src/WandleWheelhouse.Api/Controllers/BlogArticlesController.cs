// Location: src/WandleWheelhouse.Api/Controllers/BlogArticlesController.cs

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
using Microsoft.EntityFrameworkCore; // For Include/CountAsync/AnyAsync
using System.Text.RegularExpressions;
using System.Text;
using System.Globalization;
using Ganss.Xss; // <-- Add using for HtmlSanitizer
using Microsoft.Extensions.Logging; // Ensure Logging is imported

namespace WandleWheelhouse.Api.Controllers
{
    // Assume BaseApiController sets [ApiController] and [Route("api/[controller]")]
    public class BlogArticlesController : BaseApiController
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<BlogArticlesController> _logger;

        // Inject IHtmlSanitizer if configured globally via DI, or create instance in methods
        // private readonly IHtmlSanitizer _htmlSanitizer; // Example if using DI

        public BlogArticlesController(
            IUnitOfWork unitOfWork,
            UserManager<User> userManager,
            ILogger<BlogArticlesController> logger
            // IHtmlSanitizer htmlSanitizer // Inject if configured globally
            )
        {
            _unitOfWork = unitOfWork;
            _userManager = userManager;
            _logger = logger;
            // _htmlSanitizer = htmlSanitizer; // Assign if injected
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
            // User should exist due to [Authorize], use null-forgiving operator or check if preferred
            var author = await _userManager.FindByIdAsync(userId!);
            if (author == null) return Forbid("Author not found.");

            _logger.LogInformation("User {UserId} attempting to create blog article titled: {Title}", userId, createDto.Title);

            // --- ** START HTML SANITIZATION ** ---
            var sanitizer = new HtmlSanitizer();
            // Configure allowed elements - Adjust this list carefully!
            sanitizer.AllowedTags.Clear();
            sanitizer.AllowedTags.UnionWith(new[] {
                "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "blockquote",
                "ul", "ol", "li", "h1", "h2", "h3", "h4", // Allow headings H1-H4 example
                "a", "img", "iframe", "div", "span", "pre", "code"
            });
            sanitizer.AllowedAttributes.Clear();
            sanitizer.AllowedAttributes.UnionWith(new[] {
                "href", "target", // for <a>
                "src", "alt", "width", "height", "style", // for <img> (be careful with style)
                "frameborder", "allow", "allowfullscreen", // for <iframe>
                "class" // Allow class for potential CSS styling (e.g., code block language)
            });
            sanitizer.AllowedSchemes.Clear();
            sanitizer.AllowedSchemes.UnionWith(new[] { "http", "https", "mailto" });
            // Optionally configure allowed CSS properties if style attribute is allowed
            // sanitizer.AllowedCssProperties.Clear();
            // sanitizer.AllowedCssProperties.Add("text-align");

            var sanitizedContent = sanitizer.Sanitize(createDto.Content);
            _logger.LogInformation("Sanitized blog content. Original length: {OriginalLen}, Sanitized length: {SanitizedLen}", createDto.Content.Length, sanitizedContent.Length);
            // --- ** END HTML SANITIZATION ** ---

            // Handle Slug
            string slug = string.IsNullOrWhiteSpace(createDto.Slug)
                ? GenerateSlug(createDto.Title)
                : GenerateSlug(createDto.Slug); // Also sanitize/slugify provided slug

            if (!IsValidSlug(slug))
            {
                slug = GenerateSlug(createDto.Title); // Regenerate if invalid
                if (!IsValidSlug(slug)) // Fallback if title generates invalid slug
                {
                    slug = Guid.NewGuid().ToString("N").Substring(0, 10);
                    _logger.LogWarning("Invalid slug generated for title '{Title}'. Using fallback: {Slug}", createDto.Title, slug);
                }
            }

            // Check slug uniqueness
            // Use AnyAsync directly on the context's DbSet
            if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == slug))
            {
                slug = $"{slug}-{DateTime.UtcNow:yyyyMMddHHmmss}";
                _logger.LogWarning("Generated slug collided, appended timestamp: {Slug}", slug);
            }

            var article = new BlogArticle
            {
                BlogArticleId = Guid.NewGuid(),
                Title = createDto.Title,
                Content = sanitizedContent, // <-- Use SANITIZED content
                Excerpt = createDto.Excerpt, // Assuming plain text
                Caption = createDto.Caption, // Assuming plain text
                ImageUrl = createDto.ImageUrl,
                PublicationDate = DateTime.UtcNow,
                LastUpdatedDate = DateTime.UtcNow,
                AuthorId = userId!,
                Slug = slug,
                IsPublished = createDto.IsPublished
            };

            if (article.IsPublished) { article.PublicationDate = DateTime.UtcNow; }

            try
            {
                await _unitOfWork.BlogArticles.AddAsync(article);
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Blog article '{Title}' (ID: {ArticleId}) created by User {UserId}.", article.Title, article.BlogArticleId, userId);

                var responseDto = MapToResponseDto(article, author);
                return CreatedAtAction(nameof(GetBlogArticleById), new { id = article.BlogArticleId }, responseDto);
            }
            catch (DbUpdateException dbEx) // Catch specific DB errors
            {
                _logger.LogError(dbEx, "Database error creating blog article '{Title}' by User {UserId}.", createDto.Title, userId);
                // Check inner exception for details (e.g., constraint violation)
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to save blog article due to database error.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating blog article '{Title}' by User {UserId}.", createDto.Title, userId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to create blog article.");
            }
        }

        // --- Get Published Blog Articles (Public, Paginated) ---
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResultDto<BlogArticleCardDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPublishedBlogArticles([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            // --- Input Validation ---
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 50) pageSize = 50; // Max page size limit

            _logger.LogInformation("Request for published blog articles. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);

            try
            {
                // Get total count of published articles first
                var totalCount = await _unitOfWork.Context.BlogArticles
                                            .CountAsync(a => a.IsPublished);

                // Get the articles for the current page
                var articles = await _unitOfWork.Context.BlogArticles
                                            .Where(a => a.IsPublished)
                                            .Include(a => a.Author) // Include author for mapping
                                            .OrderByDescending(a => a.PublicationDate)
                                            .Skip((pageNumber - 1) * pageSize)
                                            .Take(pageSize)
                                            .AsNoTracking() // Read-only query optimization
                                            .ToListAsync();

                // Map to DTOs
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching published blog articles. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve blog articles.");
            }
        }

        // --- Get All Articles (Admin/Editor, Paginated) ---
        [HttpGet("all")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(typeof(PagedResultDto<BlogArticleCardDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllBlogArticles([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            // --- Input Validation ---
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1) pageSize = 1;
            if (pageSize > 50) pageSize = 50;

            _logger.LogInformation("Admin/Editor request for ALL blog articles. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);

            try
            {
                var totalCount = await _unitOfWork.Context.BlogArticles.CountAsync(); // Count all

                var articles = await _unitOfWork.Context.BlogArticles
                                            .Include(a => a.Author)
                                            .OrderByDescending(a => a.LastUpdatedDate) // Order by update date for admin view?
                                            .Skip((pageNumber - 1) * pageSize)
                                            .Take(pageSize)
                                            .AsNoTracking()
                                            .ToListAsync();

                // Map using Card DTO, ensuring IsPublished is included
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all blog articles for admin. Page: {PageNumber}, Size: {PageSize}", pageNumber, pageSize);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve all blog articles.");
            }
        }

        // --- Get Single Published Article by Slug (Public) ---
        [HttpGet("slug/{slug}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(BlogArticleResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetPublishedBlogArticleBySlug(string slug)
        {
            _logger.LogInformation("Request for published article by slug: {Slug}", slug);
            if (string.IsNullOrWhiteSpace(slug)) return BadRequest("Slug cannot be empty.");

            try
            {
                var article = await _unitOfWork.Context.BlogArticles
                                      .Include(a => a.Author)
                                      .AsNoTracking()
                                      .FirstOrDefaultAsync(a => a.Slug == slug && a.IsPublished);

                if (article == null) { return NotFound($"Article with slug '{slug}' not found or not published."); }

                var dto = MapToResponseDto(article, article.Author);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching published article by slug: {Slug}", slug);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve article.");
            }
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
                var article = await _unitOfWork.Context.BlogArticles
                                      .Include(a => a.Author)
                                      .AsNoTracking()
                                      .FirstOrDefaultAsync(a => a.BlogArticleId == id);

                if (article == null) { return NotFound($"Article with ID '{id}' not found."); }

                var dto = MapToResponseDto(article, article.Author);
                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching article by ID: {ArticleId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to retrieve article.");
            }
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
            _logger.LogInformation("User {UserId} attempting to update article {ArticleId}", userId, id);

            var article = await _unitOfWork.BlogArticles.GetByIdAsync(id); // Need write tracking
            if (article == null) { return NotFound($"Article with ID '{id}' not found."); }

            // Authorization Check
            var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value);
            bool isAdmin = userRoles.Contains("Administrator");
            bool isAuthor = article.AuthorId == userId;
            // Editor role check needs User object, not strictly needed if Author check is sufficient
            // bool isEditor = await _userManager.IsInRoleAsync(await _userManager.FindByIdAsync(userId!), "Editor");
            if (!isAdmin && !isAuthor) // Allow Admin or Author (assuming Author implies Editor rights to edit OWN post)
            { return Forbid(); }


            // --- ** START HTML SANITIZATION ** ---
            var sanitizer = new HtmlSanitizer();
            // Configure sanitizer exactly as in CreateBlogArticle (refactor to shared config later)
            sanitizer.AllowedTags.Clear(); sanitizer.AllowedTags.UnionWith(new[] { "p", "br", "strong", "b", "em", "i", "u", "s", "strike", "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "a", "img", "iframe", "div", "span", "pre", "code" });
            sanitizer.AllowedAttributes.Clear(); sanitizer.AllowedAttributes.UnionWith(new[] { "href", "target", "src", "alt", "width", "height", "frameborder", "allow", "allowfullscreen", "style", "class" });
            sanitizer.AllowedSchemes.Clear(); sanitizer.AllowedSchemes.UnionWith(new[] { "http", "https", "mailto" });
            // --- ** END HTML SANITIZATION CONFIG ** ---


            // --- Apply Updates ---
            bool updated = false;
            if (updateDto.Title != null && article.Title != updateDto.Title) { article.Title = updateDto.Title; updated = true; }
            if (updateDto.Content != null && article.Content != updateDto.Content)
            {
                article.Content = sanitizer.Sanitize(updateDto.Content); // <-- Sanitize Updated Content
                updated = true;
            }
            if (updateDto.Excerpt != null && article.Excerpt != updateDto.Excerpt) { article.Excerpt = updateDto.Excerpt; updated = true; }
            if (updateDto.Caption != null && article.Caption != updateDto.Caption) { article.Caption = updateDto.Caption; updated = true; }
            if (updateDto.ImageUrl != null && article.ImageUrl != updateDto.ImageUrl) { article.ImageUrl = updateDto.ImageUrl; updated = true; }

            // Handle slug update/regeneration
            if (updateDto.Slug != null) // If slug is explicitly provided
            {
                var newSlug = GenerateSlug(updateDto.Slug); // Sanitize/slugify provided slug
                if (!IsValidSlug(newSlug)) return BadRequest("Provided slug format is invalid.");
                if (article.Slug != newSlug)
                {
                    // Check uniqueness before applying explicit slug change
                    if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == newSlug && a.BlogArticleId != id))
                    { return BadRequest("Provided slug is already in use."); }
                    article.Slug = newSlug;
                    updated = true;
                }
            }
            else if (updateDto.Title != null && article.Title != updateDto.Title) // If title changed and slug wasn't provided
            {
                // Regenerate slug from new title
                var generatedSlug = GenerateSlug(article.Title);
                if (article.Slug != generatedSlug)
                {
                    if (!IsValidSlug(generatedSlug))
                    { // Fallback needed? Should be valid if title ok
                        generatedSlug = Guid.NewGuid().ToString("N").Substring(0, 10);
                    }
                    // Check uniqueness
                    if (await _unitOfWork.Context.BlogArticles.AnyAsync(a => a.Slug == generatedSlug && a.BlogArticleId != id))
                    { generatedSlug = $"{generatedSlug}-{DateTime.UtcNow:yyyyMMddHHmmss}"; }
                    article.Slug = generatedSlug;
                    updated = true;
                }
            }

            if (updated)
            {
                article.LastUpdatedDate = DateTime.UtcNow;
                // No need to call _unitOfWork.BlogArticles.Update(article) if using tracking GetByIdAsync
                try
                {
                    await _unitOfWork.CompleteAsync();
                    _logger.LogInformation("Article {ArticleId} updated successfully by User {UserId}.", id, userId);
                }
                catch (DbUpdateException dbEx) { _logger.LogError(dbEx, "Database error updating blog article {ArticleId}.", id); return StatusCode(StatusCodes.Status500InternalServerError, "Failed to save article update."); }
                catch (Exception ex) { _logger.LogError(ex, "Unexpected error updating blog article {ArticleId}.", id); return StatusCode(StatusCodes.Status500InternalServerError, "Failed to update article."); }
            }
            else
            {
                _logger.LogInformation("Article {ArticleId} update request had no changes.", id);
            }

            // Fetch again with author to return updated DTO (need tracking for this)
            // Alternatively, map the updated 'article' object directly if Author loaded initially
            var currentAuthor = await _userManager.FindByIdAsync(article.AuthorId); // Fetch author if not included
            return Ok(MapToResponseDto(article, currentAuthor));
        }


        // --- Publish/Unpublish/Delete Endpoints (remain the same) ---
        [HttpPost("{id:guid}/publish")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(StatusCodes.Status204NoContent)] /* ... */
        public async Task<IActionResult> PublishArticle(Guid id) { return await SetPublishStatus(id, true); }

        [HttpPost("{id:guid}/unpublish")]
        [Authorize(Roles = "Administrator,Editor")]
        [ProducesResponseType(StatusCodes.Status204NoContent)] /* ... */
        public async Task<IActionResult> UnpublishArticle(Guid id) { return await SetPublishStatus(id, false); }

        private async Task<IActionResult> SetPublishStatus(Guid id, bool publish) { /* ... existing logic ... */ return NoContent(); }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Administrator")]
        [ProducesResponseType(StatusCodes.Status204NoContent)] /* ... */
        public async Task<IActionResult> DeleteBlogArticle(Guid id) { /* ... existing logic ... */ return NoContent(); }


        // --- Helper Methods ---
        private static string GenerateSlug(string phrase) { /* ... existing logic ... */ return ""; } // Replace with actual logic
        private static bool IsValidSlug(string slug) { /* ... existing logic ... */ return true; } // Replace with actual logic

        // Map Entity to Full Response DTO - ** UPDATED **
        private BlogArticleResponseDto MapToResponseDto(BlogArticle article, User? author)
        {
            return new BlogArticleResponseDto
            {
                BlogArticleId = article.BlogArticleId,
                Title = article.Title,
                Content = article.Content,
                Excerpt = article.Excerpt,
                Caption = article.Caption,
                ImageUrl = article.ImageUrl,
                PublicationDate = article.PublicationDate,
                LastUpdatedDate = article.LastUpdatedDate,
                IsPublished = article.IsPublished,
                Slug = article.Slug,
                AuthorId = article.AuthorId,
                AuthorFullName = author != null ? $"{author.FirstName} {author.LastName}" : "Unknown Author",
                AuthorAvatarUrl = author?.AvatarUrl // <-- Add Author Avatar URL
            };
        }

        // Map Entity to Card DTO (for lists) - ** UPDATED **
        private BlogArticleCardDto MapToCardDto(BlogArticle article)
        {
            // This assumes the 'article' object passed in has its 'Author' property loaded via .Include()
            return new BlogArticleCardDto
            {
                BlogArticleId = article.BlogArticleId,
                Title = article.Title,
                Excerpt = article.Excerpt,
                ImageUrl = article.ImageUrl,
                PublicationDate = article.PublicationDate,
                Slug = article.Slug,
                AuthorAvatarUrl = article.Author?.AvatarUrl, // <-- Add Author Avatar URL
                AuthorFullName = article.Author != null ? $"{article.Author.FirstName} {article.Author.LastName}" : "Unknown Author",
                IsPublished = article.IsPublished // <-- Add IsPublished Status
            };
        }
    }
}