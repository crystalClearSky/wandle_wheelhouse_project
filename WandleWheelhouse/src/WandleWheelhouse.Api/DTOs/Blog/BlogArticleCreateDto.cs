using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace WandleWheelhouse.Api.DTOs.Blog;

#nullable enable
public class BlogArticleCreateDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Excerpt { get; set; }

    [MaxLength(1000)]
    public string? Caption { get; set; }

    [Url] // Basic validation for URL format
    [MaxLength(2048)]
    public string? ImageUrl { get; set; }

    // Slug is optional, can be auto-generated from Title if empty
    [MaxLength(100)]
    [RegularExpression(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", ErrorMessage = "Slug must be lowercase alphanumeric with hyphens and no spaces.")]
    public string? Slug { get; set; }

    // Defaults to false (draft) if not provided
    public bool IsPublished { get; set; } = false;
}
#nullable disable