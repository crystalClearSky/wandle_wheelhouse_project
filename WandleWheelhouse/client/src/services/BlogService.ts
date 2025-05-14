import apiClient from './api';
import axios from 'axios';
import { PagedResultDto } from '../dto/Common/PagedResultDto';
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto';
import { BlogArticleResponseDto } from '../dto/Blog/BlogArticleResponseDto';

const BlogService = {
    // Fetch published articles for public display (paginated)
    getPublishedArticles: async (pageNumber: number = 1, pageSize: number = 5)
        : Promise<PagedResultDto<BlogArticleCardDto>> => {
        try {
            // Use URLSearchParams for cleaner query parameter handling
            const params = new URLSearchParams();
            params.append('pageNumber', pageNumber.toString());
            params.append('pageSize', pageSize.toString());

            const response = await apiClient.get<PagedResultDto<BlogArticleCardDto>>(`/blogarticles?${params.toString()}`);
            return response.data;
        } catch (error: unknown) {
            console.error('Error fetching published articles:', error);
            // Re-throw a generic error or handle specific Axios errors if needed
            throw new Error('Failed to fetch published articles.');
        }
    },

    // Fetch a single published article by its slug
    getArticleBySlug: async (slug: string): Promise<BlogArticleResponseDto> => {
        try {
            // Ensure slug is properly encoded for the URL if it might contain special characters
            const encodedSlug = encodeURIComponent(slug);
            const response = await apiClient.get<BlogArticleResponseDto>(`/blogarticles/slug/${encodedSlug}`);
            return response.data;
        } catch (error: unknown) {
             console.error(`Error fetching article by slug '${slug}':`, error);
             // Check if it was a 404 specifically
             if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new Error(`Article with slug '${slug}' not found.`);
             }
             throw new Error('Failed to fetch article.');
        }
    },

    // Check if any published articles exist
    hasArticles: async (): Promise<boolean> => {
        try {
            // Fetch minimal data (1 article) to check existence
            const params = new URLSearchParams();
            params.append('pageNumber', '1');
            params.append('pageSize', '1');

            const response = await apiClient.get<PagedResultDto<BlogArticleCardDto>>(`/blogarticles?${params.toString()}`);
            return response.data.totalCount > 0;
        } catch (error: unknown) {
            console.error('Error checking for published articles:', error);
            return false; // Fallback to false on error
        }
    },
};

export default BlogService;