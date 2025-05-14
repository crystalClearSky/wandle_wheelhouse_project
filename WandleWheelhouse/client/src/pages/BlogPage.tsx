import React, { useState, useEffect } from 'react';
import BlogCard from '../components/blog/BlogCard';
import BlogHeadlineCard from '../components/blog/BlogHeadlineCard';
import BlogService from '../services/BlogService';
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto';
import PaginationControls from '../components/common/PaginationControls';
import { ArrowUpIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const BlogPage: React.FC = () => {
  // --- State ---
  const [articles, setArticles] = useState<BlogArticleCardDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching ---
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
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        console.error(err);
        setArticles([]);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
    if (currentPage > 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, pageSize]);

  // --- Handlers ---
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Loading State */}
      {isLoading && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg animate-pulse"
              >
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center shadow-md">
            <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold">Error: {error}</p>
          </div>
        </div>
      )}

      {/* No Articles State */}
      {!isLoading && !error && articles.length === 0 && (
        <div className="container mx-auto px-20 sm:px-6 lg:px-8 py-30">
          <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-6 text-center shadow-md">
            <p className="text-gray-600 font-semibold">No blog posts found.</p>
            <p className="text-gray-500 mt-2">Check back later for new content!</p>
          </div>
        </div>
      )}

      {/* Articles Display */}
      {!isLoading && !error && articles.length > 0 && (
        <>
          {/* Headline Card (Full Screen) on First Page */}
          {currentPage === 1 && articles[0] && (
            <div className="relative bg-gradient-to-b from-indigo-100 to-gray-50">
              <BlogHeadlineCard article={articles[0]} isFullScreen={true} />
            </div>
          )}

          {/* Grid and Pagination Section */}
          <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Section Title */}
            {currentPage > 1 && (
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 text-center animate-fade-in">
                More Posts
              </h2>
            )}
            {currentPage === 1 && articles.length > 1 && (
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 text-center animate-fade-in">
                Recent Posts
              </h2>
            )}

            {/* Blog Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {(currentPage === 1 ? articles.slice(1) : articles).map((article) => (
                <div
                  key={article.blogArticleId}
                  className="transform transition-all hover:scale-105 animate-fade-in"
                >
                  <BlogCard article={article} />
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 animate-fade-in">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Back to Top Button */}
      {!isLoading && articles.length > 0 && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 focus:outline-none"
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

// Inline styles for animations
// const styles = `
//   @keyframes fadeIn {
//     from { opacity: 0; transform: translateY(10px); }
//     to { opacity: 1; transform: translateY(0); }
//   }
//   .animate-fade-in {
//     animation: fadeIn 0.5s ease-out;
//   }
// `;

export default BlogPage;