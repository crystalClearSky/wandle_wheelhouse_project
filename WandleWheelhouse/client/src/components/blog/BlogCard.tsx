// Location: src/components/blog/BlogCard.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { BlogArticleCardDto } from '../../dto/Blog/BlogArticleCardDto';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar'; // Import the reusable Avatar component

interface BlogCardProps {
  article: BlogArticleCardDto;
}

const BlogCard: React.FC<BlogCardProps> = ({ article }) => {
  // Format the publication date
  const publicationDate = new Date(article.publicationDate).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    // Main card container
<div className="bg-white rounded-lg shadow-md overflow-hidden min-w-[300px] max-w-[350px] flex flex-col">  {/* Example */}

      {/* Image Section */}
      {article.imageUrl ? (
        <Link to={`/blog/${article.slug}`}>
             <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-48 object-cover hover:opacity-90 transition-opacity duration-200"
             />
        </Link>
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">No Image</div>
      )}

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 text-gray-800 hover:text-blue-600">
            <Link to={`/blog/${article.slug}`}>
                {article.title}
            </Link>
        </h3>

         {/* Author and Date Row - Includes Avatar and Centering */}
         <div className="flex items-center justify-center text-xs text-gray-500 mb-2">
             {/* Use the Avatar component, passing author's name and avatar URL */}
             <Avatar
                name={article.authorFullName}
                imageUrl={article.authorAvatarUrl} // <-- Pass author avatar URL
                size="sm"
                className="mr-1.5"
             />
             <span>By {article.authorFullName || 'Wandle Wheelhouse'}</span>
             <span className="mx-1.5">|</span>
             <span>{publicationDate}</span>
         </div>

         {/* Excerpt/Caption */}
        <p className="text-sm text-gray-600 mb-4 flex-grow">
          {article.excerpt || 'Read more to see the full content...'}
        </p>

         {/* Read More Button */}
         <div className="mt-auto text-right">
            <Link to={`/blog/${article.slug}`}>
                <Button variant="secondary" className="text-xs py-1 px-2">Read More</Button>
            </Link>
         </div>
      </div>
    </div>
  );
};

export default BlogCard;