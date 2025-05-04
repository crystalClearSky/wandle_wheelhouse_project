// Location: client/src/dto/Blog/BlogArticleCreateDto.ts

// Defines the structure for the request body when creating a blog article
export interface BlogArticleCreateDto {
    title: string;
    content: string;
    excerpt?: string | null;
    caption?: string | null;
    imageUrl?: string | null;
    slug?: string | null; // Optional: backend generates if blank
    isPublished: boolean; // Default to false in frontend state if needed
  }