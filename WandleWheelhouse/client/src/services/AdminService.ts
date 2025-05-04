// Location: src/services/AdminService.ts

import apiClient from './api';
import { PagedResultDto } from '../dto/Common/PagedResultDto';
import { UserDetailDto } from '../dto/Users/UserDetailDto';
import { AssignRoleDto } from '../dto/Admin/AssignRoleDto';
import { RoleDto } from '../dto/Roles/RoleDto';
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto';
import { BlogArticleCreateDto } from '../dto/Blog/BlogArticleCreateDto';
import { BlogArticleResponseDto } from '../dto/Blog/BlogArticleResponseDto';
import axios from 'axios'; // For error checking

// Service object containing methods for Admin API calls
const AdminService = {

    // --- User Management Methods ---

    getUsers: async (pageNumber: number = 1, pageSize: number = 10)
        : Promise<PagedResultDto<UserDetailDto>> => {
        try {
            const params = new URLSearchParams();
            params.append('pageNumber', pageNumber.toString());
            params.append('pageSize', pageSize.toString());
            const response = await apiClient.get<PagedResultDto<UserDetailDto>>(`/admin/users?${params.toString()}`);
            return response.data;
        } catch (error: unknown) {
            console.error('Admin Get Users error:', error);
            let message = 'Failed to fetch users.';
            if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.message || message; }
            else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },

    removeUser: async (userId: string): Promise<void> => {
        try {
            await apiClient.delete(`/admin/users/${userId}`);
        } catch (error: unknown) {
            console.error(`Admin Remove User ${userId} error:`, error);
            let message = 'Failed to remove user.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.response?.data?.title || error.message || message; }
             else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },

    // --- Role Management Methods ---

    getRoles: async (): Promise<RoleDto[]> => {
        try {
            const response = await apiClient.get<RoleDto[]>('/admin/roles');
            return response.data;
        } catch (error: unknown) {
            console.error('Admin Get Roles error:', error);
            let message = 'Failed to fetch roles.';
            if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.message || message; }
            else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },

    assignRoleToUser: async (userId: string, roleName: string): Promise<void> => {
         const data: AssignRoleDto = { roleName };
         try {
             await apiClient.post(`/admin/users/${userId}/roles`, data);
         } catch (error: unknown) {
             console.error(`Admin Assign Role ${roleName} to ${userId} error:`, error);
             let message = 'Failed to assign role.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.response?.data?.title || error.message || message; }
             else if (error instanceof Error) { message = error.message; }
             throw new Error(message);
         }
    },

    removeRoleFromUser: async (userId: string, roleName: string): Promise<void> => {
         try {
             const encodedRoleName = encodeURIComponent(roleName);
             await apiClient.delete(`/admin/users/${userId}/roles/${encodedRoleName}`);
         } catch (error: unknown) {
             console.error(`Admin Remove Role ${roleName} from ${userId} error:`, error);
             let message = 'Failed to remove role.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.response?.data?.title || error.message || message; }
             else if (error instanceof Error) { message = error.message; }
             throw new Error(message);
         }
    },

    // --- Blog Article Management Methods ---

    getAllBlogArticles: async (pageNumber: number = 1, pageSize: number = 10)
        : Promise<PagedResultDto<BlogArticleCardDto>> => {
         try {
            const params = new URLSearchParams();
            params.append('pageNumber', pageNumber.toString());
            params.append('pageSize', pageSize.toString());
            const response = await apiClient.get<PagedResultDto<BlogArticleCardDto>>(`/blogarticles/all?${params.toString()}`);
            return response.data;
        } catch (error: unknown) {
            console.error('Admin Get All Articles error:', error);
            let message = 'Failed to fetch blog articles.';
            if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.message || message; }
            else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },

    publishArticle: async (articleId: string): Promise<void> => {
        try {
            await apiClient.post(`/blogarticles/${articleId}/publish`);
        }
        
        catch (error: unknown) {
             console.error(`Admin Publish Article ${articleId} error:`, error);
             let message = 'Failed to publish article.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.response?.data?.title || error.message || message; }
             else if (error instanceof Error) { message = error.message; }
             throw new Error(message); // Still re-throw normalized error
        }
    },

    unpublishArticle: async (articleId: string): Promise<void> => {
         try {
             await apiClient.post(`/blogarticles/${articleId}/unpublish`);
         }
        
         catch (error: unknown) {
              console.error(`Admin Unpublish Article ${articleId} error:`, error);
              let message = 'Failed to unpublish article.';
              if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.response?.data?.title || error.message || message; }
              else if (error instanceof Error) { message = error.message; }
              throw new Error(message); // Still re-throw normalized error
         }
    },

    deleteArticle: async (articleId: string): Promise<void> => {
         try {
             await apiClient.delete(`/blogarticles/${articleId}`);
         }
         
         catch (error: unknown) {
             console.error(`Admin Delete Article ${articleId} error:`, error);
             let message = 'Failed to delete article.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) { message = error.response?.data?.message || error.response?.data?.title || error.message || message; }
             else if (error instanceof Error) { message = error.message; }
             throw new Error(message); // Still re-throw normalized error
         }
    },

    createBlogArticle: async (data: BlogArticleCreateDto): Promise<BlogArticleResponseDto> => {
        try {
            const response = await apiClient.post<BlogArticleResponseDto>('/blogarticles', data);
            return response.data;
        } catch (error: unknown) {
            console.error('Admin Create Article error:', error);
            let message = 'Failed to create blog article.';
             if (axios.isAxiosError(error) && error.response?.status !== 401) {
                 if (error.response?.data?.errors && typeof error.response.data.errors === 'object') {
                     message = Object.values(error.response.data.errors).flat().join(' ');
                 } else {
                      message = error.response?.data?.message || error.response?.data?.title || error.message || message;
                 }
             } else if (error instanceof Error) { message = error.message; }
            throw new Error(message);
        }
    },

    // Add methods for managing donations, subscriptions, newsletter subs later
};

export default AdminService;