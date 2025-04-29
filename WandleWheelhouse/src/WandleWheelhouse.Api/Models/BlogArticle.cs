using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

    namespace WandleWheelhouse.Api.Models;

    #nullable enable

    public class BlogArticle
    {
        [Key]
        public Guid BlogArticleId { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Content { get; set; } = string.Empty; // Main article content (can be long)

        [MaxLength(500)] // Short summary for cards
        public string? Excerpt { get; set; }

        [MaxLength(1000)] // For caption below image
        public string? Caption { get; set; }

        public string? ImageUrl { get; set; } // URL or path to the image file stored elsewhere

        [Required]
        public DateTime PublicationDate { get; set; } = DateTime.UtcNow;

        public DateTime LastUpdatedDate { get; set; } = DateTime.UtcNow;

        [Required]
        [ForeignKey("Author")]
        public string AuthorId { get; set; } = null!; // Link to the User who wrote it
        public virtual User Author { get; set; } = null!;

         public bool IsPublished { get; set; } = false; // Allow drafts

         // Optional: SEO fields
         [MaxLength(100)]
         public string? Slug { get; set; } // URL-friendly version of title
    }
    #nullable disable