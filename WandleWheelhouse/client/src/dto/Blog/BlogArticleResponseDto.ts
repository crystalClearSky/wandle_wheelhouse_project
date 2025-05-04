// src/dto/Blog/BlogArticleResponseDto.ts

// Represents the full details of a Blog Article from the API
export interface BlogArticleResponseDto {
    blogArticleId: string; // Assuming GUID becomes string
    title: string;
    content: string; // Full content
    excerpt?: string | null;
    caption?: string | null;
    imageUrl?: string | null;
    publicationDate: string; // ISO Date string
    lastUpdatedDate: string; // ISO Date string
    isPublished: boolean;
    slug?: string | null;
  
    // Author details (matching backend DTO)
    authorId: string;
    authorFullName?: string | null;
    authorAvatarUrl?: string | null; // <-- Add this
  }