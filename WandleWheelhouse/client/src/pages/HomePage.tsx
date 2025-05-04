// Location: src/pages/HomePage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import BlogCard from '../components/blog/BlogCard'; // Component for small blog cards
import BlogService from '../services/BlogService'; // Service for fetching blog data
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto'; // DTO for blog card

const HomePage: React.FC = () => {
  // Styles for the CONSTRAINED sections (Mission, Blog) below the full-screen welcome
  const constrainedSectionWidthStyle = "w-full max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8";
  // Base styles for the inner div of constrained sections (fixed height)
  const constrainedSectionBaseStyle = "h-[500px] rounded-lg shadow-lg relative flex flex-col items-center justify-center text-center p-8 md:p-12";

  // --- State for Blog section ---
  const [blogPosts, setBlogPosts] = useState<BlogArticleCardDto[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogError, setBlogError] = useState<string | null>(null);

  // --- Effect to Fetch Blog Posts ---
  // Runs once when the component mounts
  useEffect(() => {
    const fetchPosts = async () => {
      setBlogLoading(true);
      setBlogError(null);
      try {
         // Fetch first few posts for preview (e.g., page 1, size 5)
        const result = await BlogService.getPublishedArticles(1, 5);
        setBlogPosts(result.items);
      } catch (error: unknown) {
        let message = 'Failed to load blog posts.';
         if (error instanceof Error) { message = error.message; }
        setBlogError(message);
        console.error(error);
      } finally {
        setBlogLoading(false);
      }
    };

    fetchPosts();
  }, []); // Empty dependency array ensures it runs only once on mount

  // --- Render Logic ---
  return (
    // Outer container adds vertical space between sections
    <div className="space-y-12 md:space-y-16">

      {/* === 1. Welcome Section (Full Screen) === */}
      <section className="w-full"> {/* Takes full width */}
         {/* Inner div takes min viewport height and centers content */}
        <div className="min-h-screen bg-gradient-to-r from-cyan-100 to-blue-100 flex flex-col items-center justify-center text-center p-8 md:p-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Welcome to Wandle Wheelhouse!
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl">
            Your local hub for community support, connection, and opportunity in the heart of Croydon.
          </p>
          {/* Optional: Add a prominent call-to-action button */}
          {/* <Button variant="primary" size="lg" className="mt-8 py-3 px-6 text-lg">Get Involved</Button> */}
        </div>
      </section>
      {/* === End Welcome Section === */}


      {/* === 2. Mission Preview Section (Constrained Width) === */}
      <section className={`${constrainedSectionWidthStyle}`}>
         {/* Inner div has fixed height and specific background */}
        <div className={`${constrainedSectionBaseStyle} bg-gradient-to-r from-teal-100 to-green-100`}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Our Mission
          </h2>
          {/* Updated preview text */}
          <p className="text-lg text-gray-700 max-w-2xl">
            Dedicated to empowering our Croydon community through essential support, fostering connections, and creating opportunities for growth and resilience. Click below to learn more about our values and activities.
          </p>
          {/* "Read More" Button */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
            <Link to="/mission">
               <Button variant="secondary" className="py-2 px-4 text-sm">Read More</Button>
            </Link>
          </div>
        </div>
      </section>
      {/* === End Mission Preview Section === */}


      {/* === 3. Blog Preview Section (Constrained Width) === */}
      <section className={`${constrainedSectionWidthStyle}`}>
         {/* Inner div styling - adjusted height to be flexible but have min */}
         <div className="h-auto min-h-[500px] rounded-lg shadow-lg relative flex flex-col items-center justify-start text-center bg-gradient-to-r from-purple-100 to-pink-100 p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            From the Blog
          </h2>

          {/* Blog Post Display Area */}
          <div className="w-full flex-grow flex items-center justify-center mb-16"> {/* Added mb-16 for button spacing */}
            {blogLoading && <p className="text-gray-600">Loading posts...</p>}
            {blogError && <p className="text-red-600">Error: {blogError}</p>}
            {!blogLoading && !blogError && blogPosts.length === 0 && (
              <p className="text-gray-600">No recent blog posts available yet.</p>
            )}
            {/* Horizontal Scroll Container for Blog Cards */}
            {!blogLoading && !blogError && blogPosts.length > 0 && (
              // NOTE: Requires Tailwind active for flex, overflow, scrollbar styling
              <div className="flex space-x-4 overflow-x-auto py-4 w-full scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100">
                 {blogPosts.map(post => (
                   <BlogCard key={post.blogArticleId} article={post} />
                 ))}
                 {/* Optional: Add a spacer or visual cue at the end */}
                 {/* <div className="flex-shrink-0 w-4"></div> */}
              </div>
            )}
          </div>

           {/* "Latest Posts" Button */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
            <Link to="/blog">
               <Button variant="secondary" className="py-2 px-4 text-sm">Latest Posts</Button>
            </Link>
          </div>
        </div>
      </section>
      {/* === End Blog Preview Section === */}

    </div> // End outer spacing div
  );
};

export default HomePage;