// Location: src/pages/BlogPage.tsx

import React, { useState, useEffect } from 'react';
import BlogCard from '../components/blog/BlogCard';
import BlogHeadlineCard from '../components/blog/BlogHeadlineCard';
import BlogService from '../services/BlogService';
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto';
import PaginationControls from '../components/common/PaginationControls';

const BlogPage: React.FC = () => {
  // --- State and useEffect Hook remain the same ---
  const [articles, setArticles] = useState<BlogArticleCardDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await BlogService.getPublishedArticles(currentPage, pageSize);
        setArticles(result.items);
        setTotalPages(Math.ceil(result.totalCount / pageSize));
      } catch (err: unknown) {
        let message = 'Failed to load articles.';
        if (err instanceof Error) { message = err.message; }
        setError(message);
        console.error(err);
        setArticles([]);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
    // Only scroll to top if not on page 1 after initial load,
    // otherwise the full-screen section jumps.
    if (currentPage > 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

  }, [currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- Updated Render Logic ---
  return (
    // Remove container/padding from the outermost div
    <div className="min-h-[calc(100vh-10rem)]"> {/* Keep min-height maybe */}

      {/* Loading State (Full width) */}
      {isLoading && (
          <div className="flex justify-center items-center min-h-screen">Loading articles...</div>
      )}

      {/* Error State (Constrained width for better readability) */}
      {error && (
          <div className="container mx-auto px-4 py-8">
              <div className="text-center text-red-600 bg-red-100 p-4 rounded shadow max-w-md mx-auto">
                Error: {error}
              </div>
          </div>
      )}

      {/* No Articles State (Constrained width) */}
      {!isLoading && !error && articles.length === 0 && (
         <div className="container mx-auto px-4 py-8">
            <div className="text-center text-gray-600 py-10">No blog posts found.</div>
        </div>
      )}

      {/* --- Articles Display --- */}
      {!isLoading && !error && articles.length > 0 && (
        <>
          {/* Render Headline Card (full screen) ONLY on the first page */}
          {currentPage === 1 && articles[0] && (
             <BlogHeadlineCard article={articles[0]} isFullScreen={true} /> // <-- Pass isFullScreen prop
             // Separator is removed as content below is now distinctly sectioned
          )}

          {/* --- Container for Grid and Pagination --- */}
          {/* Apply width constraints ONLY to this section */}
          <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

              {/* Title for the grid section (optional) */}
              {currentPage > 1 && (
                   <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">
                     More Posts
                   </h2>
              )}
               {currentPage === 1 && articles.length > 1 && (
                   <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8 text-center">
                     Recent Posts
                   </h2>
              )}


              {/* Grid for smaller cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-8 justify-items-center">
                 {/* On page 1, map over items *after* the first one */}
                 {currentPage === 1 && articles.length > 1 &&
                     articles.slice(1).map(article => (
                       <BlogCard key={article.blogArticleId} article={article} />
                 ))}
                 {/* On subsequent pages, map over all items */}
                 {currentPage > 1 &&
                     articles.map(article => (
                       <BlogCard key={article.blogArticleId} article={article} />
                 ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
          </div>
          {/* --- End Container for Grid --- */}
        </>
      )}
      {/* --- End Articles Display --- */}

    </div>
  );
};

export default BlogPage;