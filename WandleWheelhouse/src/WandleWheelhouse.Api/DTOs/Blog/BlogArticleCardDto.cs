using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace WandleWheelhouse.Api.DTOs.Blog;

#nullable enable
public class BlogArticleCardDto
{
    public Guid BlogArticleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime PublicationDate { get; set; }
    public string? Slug { get; set; }

    // Author details
    public string? AuthorFullName { get; set; }
}
#nullable disable