// Location: src/pages/FullBlogArticlePage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Import Link for Back button
import BlogService from '../services/BlogService';
import { BlogArticleResponseDto } from '../dto/Blog/BlogArticleResponseDto';
import Avatar from '../components/ui/Avatar'; // Import Avatar component
// Import DOMPurify if using client-side sanitization
// import DOMPurify from 'dompurify';

const FullBlogArticlePage: React.FC = () => {
  // Get the slug parameter from the URL
  const { slug } = useParams<{ slug: string }>();

  // State for the article, loading, and error handling
  const [article, setArticle] = useState<BlogArticleResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get API origin for constructing image URL
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';

  // Effect to fetch the article when the component mounts or slug changes
  useEffect(() => {
    // Ensure slug exists before fetching
    if (!slug) {
      setError("Article slug is missing from URL.");
      setIsLoading(false);
      return;
    }

    const fetchArticle = async () => {
      setIsLoading(true);
      setError(null);
      setArticle(null);
      console.log(`Workspaceing article for slug: ${slug}`);

      try {
        const data = await BlogService.getArticleBySlug(slug);
        setArticle(data);
      } catch (err: unknown) { // Catch error as unknown
        let message = 'Failed to load article.';
        // Check if it's a standard Error object to get the message
        if (err instanceof Error) {
           message = err.message;
        }
        setError(message);
        console.error(`Error fetching article ${slug}:`, err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();

    // Scroll to top when slug changes or component mounts
    window.scrollTo(0, 0);

  }, [slug]); // Dependency array includes slug

  // --- Render Logic ---

  // Display loading state
  if (isLoading) {
    return <div className="text-center py-20">Loading article...</div>;
  }

  // Display error state
  if (error) {
    return (
      <div className="text-center text-red-600 bg-red-100 p-6 rounded shadow max-w-lg mx-auto my-10">
         <p className="font-semibold">Error Loading Article</p>
         <p className="text-sm mt-1">{error}</p>
         <div className="mt-4">
             <Link to="/blog" className="text-blue-600 hover:underline text-sm">&larr; Back to Blog</Link>
         </div>
      </div>
    );
  }

  // Display 'Not Found' if no article loaded (and no error occurred, unlikely)
  if (!article) {
    return (
         <div className="text-center py-20">
            <p>Article not found.</p>
             <div className="mt-4">
                 <Link to="/blog" className="text-blue-600 hover:underline text-sm">&larr; Back to Blog</Link>
             </div>
         </div>
    );
  }

  // Format date once article is loaded
  const publicationDate = new Date(article.publicationDate).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
  });

  // Construct full avatar URL correctly
  const authorAvatarFullUrl = article.authorAvatarUrl && article.authorAvatarUrl.startsWith('/')
                               ? `${API_ORIGIN}${article.authorAvatarUrl}` // <-- Corrected template literal
                               : article.authorAvatarUrl;

  // Optional: Sanitize HTML content before rendering
  // const sanitizedContent = DOMPurify.sanitize(article.content);

  return (
    // Main container for the article content
    // Constrain width for readability, add padding, background etc.
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white shadow-lg rounded-lg my-8">

       {/* Back Link */}
       <Link to="/blog" className="text-blue-600 hover:underline text-sm mb-6 inline-block">&larr; Back to Blog</Link>

      {/* Article Title */}
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
        {article.title}
      </h1>

      {/* Author Meta */}
      <div className="flex items-center text-sm text-gray-500 mb-6 border-b border-gray-200 pb-4">
        {/* Use Avatar component with potentially full URL */}
        <Avatar name={article.authorFullName} imageUrl={authorAvatarFullUrl} size="md" className="mr-3" />
        <div>
            <div>By <span className="font-semibold text-gray-700">{article.authorFullName || 'Wandle Wheelhouse'}</span></div>
            <div className="mt-1">Published on {publicationDate}</div>
        </div>
      </div>

      {/* Featured Image */}
      {article.imageUrl && (
        <img
          src={article.imageUrl} // Assuming image URLs from CMS/backend are absolute
          alt={article.title}
          className="w-full h-auto max-h-[500px] object-cover rounded-md mb-8" // Added margin bottom
        />
      )}

      {/* Article Content */}
      {/* Added prose classes for Tailwind typography styling */}
      {/* WARNING: Only use dangerouslySetInnerHTML if article.content is TRUSTED or SANITIZED */}
      <div
        className="prose prose-lg max-w-none prose-img:rounded-md prose-a:text-blue-600 hover:prose-a:text-blue-800"
        dangerouslySetInnerHTML={{ __html: article.content /* or sanitizedContent */ }}
      >
        {/* HTML content is rendered here */}
      </div>

    </article>
  );
};

export default FullBlogArticlePage;