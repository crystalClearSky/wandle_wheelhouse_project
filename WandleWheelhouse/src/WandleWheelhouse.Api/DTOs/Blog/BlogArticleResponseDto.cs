using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace WandleWheelhouse.Api.DTOs.Blog;

#nullable enable
public class BlogArticleResponseDto
{
    public Guid BlogArticleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty; // Include full content
    public string? Excerpt { get; set; }
    public string? Caption { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime PublicationDate { get; set; }
    public DateTime LastUpdatedDate { get; set; }
    public bool IsPublished { get; set; }
    public string? Slug { get; set; }

    // Author details
    public string AuthorId { get; set; } = string.Empty;
    public string? AuthorFullName { get; set; } // e.g., "John Doe"
}
#nullable disable