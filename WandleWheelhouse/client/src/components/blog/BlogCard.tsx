import React from 'react';
import { Link } from 'react-router-dom';
import { BlogArticleCardDto } from '../../dto/Blog/BlogArticleCardDto';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface BlogCardProps {
  article: BlogArticleCardDto;
}

const BlogCard: React.FC<BlogCardProps> = ({ article }) => {
  const publicationDate = new Date(article.publicationDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden min-w-[300px] max-w-[350px] flex flex-col transform transition-all hover:scale-105 hover:shadow-xl border border-gray-100 animate-fade-in">
      {/* Image Section */}
      {article.imageUrl ? (
        <Link to={`/blog/${article.slug}`} className="relative block overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-56 object-cover transform hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        </Link>
      ) : (
        <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
          <PhotoIcon className="h-12 w-12" />
        </div>
      )}

      {/* Content Section */}
      <div className="p-6 flex flex-col grow">
        {/* Title */}
        <h3 className="text-xl font-extrabold text-gray-900 mb-3 hover:text-indigo-600 transition-colors duration-200">
          <Link to={`/blog/${article.slug}`}>{article.title}</Link>
        </h3>

        {/* Author and Date */}
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <Avatar
            name={article.authorFullName}
            imageUrl={article.authorAvatarUrl}
            size="sm"
            className="mr-3 ring-2 ring-indigo-100"
          />
          <span className="font-medium">{article.authorFullName || 'Wandle Wheelhouse'}</span>
          <span className="mx-3 text-gray-400">|</span>
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
            {publicationDate}
          </span>
        </div>

        {/* Excerpt */}
        <p className="text-base text-gray-600 mb-5 grow line-clamp-3 relative">
          {article.excerpt || 'Read more to see the full content...'}
          <span className="absolute bottom-0 right-0 h-6 bg-gradient-to-t from-white to-transparent w-full"></span>
        </p>

        {/* Read More Button */}
        <div className="mt-auto text-right">
          <Link to={`/blog/${article.slug}`}>
            <Button
              variant="primary"
              className="text-sm py-2 px-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-transform hover:scale-105"
            >
              Read More
            </Button>
          </Link>
        </div>
      </div>
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

export default BlogCard;