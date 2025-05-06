// src/components/blog/BlogHeadlineCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { BlogArticleCardDto } from '../../dto/Blog/BlogArticleCardDto';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

interface BlogHeadlineCardProps {
  article: BlogArticleCardDto;
  isFullScreen?: boolean; // Prop to control full screen vs card styles
}

const BlogHeadlineCard: React.FC<BlogHeadlineCardProps> = ({ article, isFullScreen = false }) => {
  const publicationDate = new Date(article.publicationDate).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
  });

  // Define base classes and conditional classes
  const containerBaseClasses = "relative bg-gray-300 overflow-hidden"; // Base styles
  const containerSizeClasses = isFullScreen
    ? "w-full h-[80vh] mb-0 rounded-none shadow-none" // Full screen styles (80% height)
    : "rounded-lg shadow-lg mb-8 md:mb-12 aspect-video md:aspect-2/1 lg:aspect-[2.5/1]"; // Original card styles

  const contentBaseClasses = "absolute inset-0 flex flex-col justify-end p-6 md:p-8 lg:p-12";
  const contentGradient = "bg-linear-to-t from-black/70 via-black/40 to-transparent";

  // Get API origin for avatar URL construction
  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || '';
  const authorAvatarFullUrl = article.authorAvatarUrl && article.authorAvatarUrl.startsWith('/')
                               ? `${API_ORIGIN}${article.authorAvatarUrl}`
                               : article.authorAvatarUrl;


  return (
    // Apply conditional size classes
    <div className={`${containerBaseClasses} ${containerSizeClasses}`}>

      {/* Background Image */}
      {article.imageUrl ? (
          <img
             src={article.imageUrl}
             alt={article.title}
             className="absolute inset-0 w-full h-full object-cover"
          />
       ) : (
          <div className="absolute inset-0 w-full h-full bg-linear-to-r from-purple-200 to-pink-200 flex items-center justify-center text-gray-500 text-xl font-semibold">
              Featured Post Area
          </div>
       )}

      {/* Gradient Overlay + Content Container */}
      <div className={`${contentBaseClasses} ${contentGradient}`}>
        <div> {/* Inner content grouping div */}
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 text-white hover:text-gray-200 drop-shadow-lg">
                <Link to={`/blog/${article.slug}`}>
                    {article.title}
                </Link>
            </h2>
            <div className="flex items-center text-sm md:text-base text-gray-200 mb-4 drop-shadow-md">
                <Avatar name={article.authorFullName} imageUrl={authorAvatarFullUrl} size="md" className="mr-2 border border-white/50" />
                <span>By {article.authorFullName || 'Wandle Wheelhouse'}</span>
                <span className="mx-2">|</span>
                <span>{publicationDate}</span>
            </div>
            <p className="text-base md:text-lg text-gray-100 mb-5 drop-shadow-md hidden md:block">
              {article.excerpt || ''}
            </p>
            <div className="mt-auto text-right">
                <Link to={`/blog/${article.slug}`}>
                    <Button variant="primary" className="py-2 px-5 bg-blue text-black hover:bg-dark-blue focus:ring-gray-300">Read More</Button>
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BlogHeadlineCard;