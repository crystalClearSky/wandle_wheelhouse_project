// Location: src/components/admin/BlogList.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import AdminService from '../../services/AdminService';
import { BlogArticleCardDto } from '../../dto/Blog/BlogArticleCardDto'; // Ensure this includes isPublished
import PaginationControls from '../common/PaginationControls';
import Button from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext'; // To check roles for actions
// Removed ManageRolesModal import as it's not used here

const BlogList: React.FC = () => {
  const { user } = useAuth(); // Get current user to check roles
  const isAdmin = user?.roles?.includes('Administrator') ?? false; // Check if Admin

  // --- State ---
  const [articles, setArticles] = useState<BlogArticleCardDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Articles per page
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // For fetch errors
  const [actionError, setActionError] = useState<string | null>(null); // For action errors (publish/delete)
  // Loading state per row/action type
  const [rowLoadingStates, setRowLoadingStates] = useState<Record<string, { publishing?: boolean, deleting?: boolean }>>({});

  const navigate = useNavigate(); // Hook for navigation (used in handleEdit)

  // Get API origin for potential avatar display (though not used in this table version)
  // const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

  // --- Data Fetching ---
  const fetchArticles = useCallback(async () => {
    // Clear errors on refetch
    setError(null);
    setActionError(null);
    try {
      console.log(`Workspaceing ALL articles - Page: ${currentPage}`);
      const result = await AdminService.getAllBlogArticles(currentPage, pageSize);
      setArticles(result.items);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
    } catch (err: unknown) {
      let message = 'Failed to load articles.';
      if (err instanceof Error) { message = err.message; }
      setError(message); // Set general fetch error
      setArticles([]); // Clear data on error
      setTotalPages(0);
    } finally {
      setIsLoading(false); // Done loading this page's data
    }
  }, [currentPage, pageSize]); // Dependencies for useCallback

  // Fetch articles on mount and when page changes
  useEffect(() => {
    setIsLoading(true); // Indicate loading when page changes or mounts
    fetchArticles();
  }, [fetchArticles]); // Use memoized fetchArticles as dependency

  // --- Handlers ---
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleTogglePublish = async (articleId: string, currentStatus: boolean) => {
    setActionError(null);
    setRowLoadingStates(prev => ({ ...prev, [articleId]: { ...prev[articleId], publishing: true } }));
    const action = currentStatus ? AdminService.unpublishArticle : AdminService.publishArticle;
    const actionName = currentStatus ? 'unpublish' : 'publish';

    try {
      await action(articleId);
      await fetchArticles(); // Refetch list to show updated status
    } catch (err: unknown) {
       let message = `Failed to ${actionName} article.`;
       if (err instanceof Error) { message = err.message; }
       setActionError(message);
       setTimeout(() => setActionError(null), 5000); // Clear error after 5s
    } finally {
       setRowLoadingStates(prev => ({ ...prev, [articleId]: { ...prev[articleId], publishing: false } }));
    }
  };

  const handleDeleteArticle = async (articleId: string, title: string) => {
     if (!isAdmin) {
        setActionError("Only Administrators can delete articles.");
        setTimeout(() => setActionError(null), 3000);
        return;
     }
     if (!window.confirm(`Are you sure you want to permanently delete the article "${title}"? This cannot be undone.`)) {
       return;
     }
     setActionError(null);
     setRowLoadingStates(prev => ({ ...prev, [articleId]: { ...prev[articleId], deleting: true } }));

     try {
       await AdminService.deleteArticle(articleId);
       // Adjust page or refetch after deletion
       if (articles.length === 1 && currentPage > 1) {
           setCurrentPage(prev => prev - 1); // Go to previous page if last item deleted
       } else {
           // Refetch current page, indicate loading
           setIsLoading(true);
           await fetchArticles();
       }
     } catch (err: unknown) {
        let message = 'Failed to delete article.';
        if (err instanceof Error) { message = err.message; }
        setActionError(message);
        setTimeout(() => setActionError(null), 5000);
     } finally {
        setRowLoadingStates(prev => ({ ...prev, [articleId]: { ...prev[articleId], deleting: false } }));
        // setIsLoading(false); // Might already be handled by fetchArticles finally block
     }
  };

  // Updated handler to navigate using ID
  const handleEdit = (articleId: string) => {
     if (!articleId) {
         console.error("Cannot edit article: missing ID.");
         alert("Cannot edit article: missing ID.");
         return;
     }
     console.log(`Navigating to edit page for ID: ${articleId}`);
     navigate(`/admin/blog/edit/${articleId}`); // Navigate using ID
  };

   // Helper to format dates
  const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
          return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch { return 'Invalid Date'; }
  };


  // --- Render Logic ---
  if (isLoading && articles.length === 0) return <p className="text-center p-4 text-gray-500">Loading blog posts...</p>;
  // Display general fetch error only if there are no articles currently shown
  if (error && articles.length === 0) return <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200">{error}</p>;

  return (
     <div className="overflow-x-auto">
        {/* Display action errors above the table */}
        {actionError && <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200 mb-4">{actionError}</p>}
        {/* Display subtle loading indicator during refetches/pagination */}
        {isLoading && articles.length > 0 && <p className="text-center text-blue-500 text-sm mb-2">Loading...</p>}

         <table className="min-w-full bg-white border border-gray-200 shadow rounded">
           <thead className="bg-gray-50 border-b border-gray-200">
             <tr>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Author</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
              {/* Handle Empty State */}
              {articles.length === 0 && !isLoading && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500">No blog posts created yet.</td></tr>
              )}
              {/* Map Through Articles */}
             {articles.map((article) => {
                 // Ensure isPublished exists on the article object (requires backend DTO update)
                 const isPublished = article.isPublished ?? false; // Default to false if missing
                 const isLoadingPublish = rowLoadingStates[article.blogArticleId]?.publishing;
                 const isLoadingDelete = rowLoadingStates[article.blogArticleId]?.deleting;
                 const isRowLoading = isLoadingPublish || isLoadingDelete;

                 return (
                   <tr key={article.blogArticleId} className={`hover:bg-gray-50 ${isRowLoading ? 'opacity-60' : ''}`}> {/* Don't block pointer events fully */}
                     {/* Title (Linked to public view) */}
                     <td className="px-4 py-2 text-sm font-medium text-gray-900 max-w-xs lg:max-w-sm xl:max-w-md truncate" title={article.title}>
                         {article.slug ? (
                            <Link to={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className='hover:text-blue-600 hover:underline' title={`View post: ${article.title}`}>
                                {article.title}
                            </Link>
                         ) : (
                             <span>{article.title}</span> // No link if no slug
                         )}
                     </td>
                     {/* Author */}
                     <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{article.authorFullName || 'N/A'}</td>
                     {/* Date */}
                     <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(article.publicationDate)}</td>
                     {/* Status Badge */}
                     <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {isPublished
                           ? <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Published</span>
                           : <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Draft</span>
                        }
                     </td>
                     {/* Action Buttons */}
                     <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2">
                        {/* Use updated handleEdit with articleId */}
                        <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => handleEdit(article.blogArticleId)} disabled={isRowLoading}>Edit</Button>
                        <Button
                           variant={isPublished ? "secondary" : "primary"}
                           className="text-xs py-1 px-2"
                           onClick={() => handleTogglePublish(article.blogArticleId, isPublished)}
                           disabled={isRowLoading}>
                           {isLoadingPublish ? '...' : (isPublished ? 'Unpublish' : 'Publish')}
                        </Button>
                        {/* Delete button only for Admins */}
                        {isAdmin && (
                            <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDeleteArticle(article.blogArticleId, article.title)} disabled={isRowLoading}>
                                {isLoadingDelete ? '...' : 'Delete'}
                            </Button>
                        )}
                     </td>
                   </tr>
                 );
             })}
           </tbody>
         </table>
         {/* Pagination Controls */}
         {totalPages > 1 && (
             <PaginationControls
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={handlePageChange}
             />
         )}
     </div>
   );
};

export default BlogList;