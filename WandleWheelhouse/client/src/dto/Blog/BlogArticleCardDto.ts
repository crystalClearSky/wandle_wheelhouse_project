// src/dto/Blog/BlogArticleCardDto.ts

export interface BlogArticleCardDto {
  blogArticleId: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  publicationDate: string; // ISO Date string
  slug?: string | null;
  authorFullName?: string | null;
  authorAvatarUrl?: string | null;
  isPublished: boolean; // <-- ADD THIS LINE
}
