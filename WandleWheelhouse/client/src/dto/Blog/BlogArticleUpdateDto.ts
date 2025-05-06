// src/dto/Blog/BlogArticleUpdateDto.ts
// Matches backend DTO for updating a blog article (all fields optional)

export interface BlogArticleUpdateDto {
    title?: string | null;
    content?: string | null; // Will be sanitized HTML string
    excerpt?: string | null;
    caption?: string | null;
    imageUrl?: string | null;
    slug?: string | null; // Optional, backend might regenerate or validate
    isPublished?: boolean | null;
  }