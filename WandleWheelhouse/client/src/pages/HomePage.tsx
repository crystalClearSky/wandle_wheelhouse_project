import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import BlogCard from '../components/blog/BlogCard';
import BlogService from '../services/BlogService';
import { BlogArticleCardDto } from '../dto/Blog/BlogArticleCardDto';
import { ArrowUpIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  // Styles for constrained sections
  const constrainedSectionWidthStyle = "w-full max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8";
  const constrainedSectionBaseStyle = "min-h-[500px] rounded-xl shadow-lg relative flex flex-col items-center justify-start text-center p-8 md:p-12 bg-white border border-gray-100";

  // --- State for Blog section ---
  const [blogPosts, setBlogPosts] = useState<BlogArticleCardDto[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogError, setBlogError] = useState<string | null>(null);

  // --- Effect to Fetch Blog Posts ---
  useEffect(() => {
    const fetchPosts = async () => {
      setBlogLoading(true);
      setBlogError(null);
      try {
        const result = await BlogService.getPublishedArticles(1, 5);
        setBlogPosts(result.items);
      } catch (error: unknown) {
        let message = 'Failed to load blog posts.';
        if (error instanceof Error) {
          message = error.message;
        }
        setBlogError(message);
        console.error(error);
      } finally {
        setBlogLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // --- Handlers ---
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 space-y-12 md:space-y-16">
      {/* === 1. Welcome Section (Full Screen) === */}
      <section className="w-full relative">
        <div
          className="min-h-screen flex items-center justify-center p-8 md:p-12 bg-cover bg-center relative"
          style={{
            backgroundImage: `url('https://wandlevalleypark.co.uk/wp-content/uploads/2016/09/Featured-Image-Wheelhouse.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative flex flex-col md:flex-row items-center justify-between w-full max-w-[1450px] mx-auto z-10 animate-fade-in">
            <div className="md:w-1/2"></div>
            <div className="md:w-1/2 text-right">
              <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">
                Welcome to Wandle Wheelhouse!
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-white max-w-lg drop-shadow-md">
                Together, we build a stronger Merton—uniting hearts, uplifting lives, and creating opportunities for all!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === 2. Mission Preview Section (Constrained Width) === */}
      <section className={`${constrainedSectionWidthStyle}`}>
        <div
          className={`${constrainedSectionBaseStyle} bg-gradient-to-r from-teal-100 to-green-100 transform transition-all hover:shadow-xl animate-fade-in`}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Our Mission
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl">
            Dedicated to empowering our Croydon community through essential support, fostering connections, and creating opportunities for growth and resilience. Click below to learn more about our values and activities.
          </p>
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
            <Link to="/mission">
              <Button
                variant="primary"
                className="py-2 px-4 text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-transform hover:scale-105 rounded-lg"
              >
                Read More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* === 3. Blog Preview Section (Constrained Width) === */}
      <section className={`${constrainedSectionWidthStyle}`}>
        <div
          className={`${constrainedSectionBaseStyle} bg-gradient-to-r from-purple-100 to-pink-100 transform transition-all hover:shadow-xl animate-fade-in`}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
            From the Blog
          </h2>
          <div className="w-full grow flex items-center justify-center mb-16">
            {blogLoading && (
              <div className="flex space-x-4 overflow-x-auto py-4 w-full scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-indigo-100 snap-x snap-mandatory">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="min-w-[300px] max-w-[350px] h-96 bg-white rounded-xl shadow-lg animate-pulse flex-shrink-0 snap-center"
                  >
                    <div className="h-56 bg-gray-200 rounded-t-xl"></div>
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {blogError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center shadow-md max-w-md mx-auto">
                <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-semibold">Error: {blogError}</p>
              </div>
            )}
            {!blogLoading && !blogError && blogPosts.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-md max-w-md mx-auto">
                <p className="text-gray-600 font-semibold">No recent blog posts available yet.</p>
                <p className="text-gray-500 mt-2">Check back later for new content!</p>
              </div>
            )}
            {!blogLoading && !blogError && blogPosts.length > 0 && (
              <div className="flex space-x-4 overflow-x-auto py-4 w-full scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-indigo-100 snap-x snap-mandatory">
                {blogPosts.map((post) => (
                  <div
                    key={post.blogArticleId}
                    className="min-w-[300px] max-w-[350px] flex-shrink-0 snap-center"
                  >
                    <BlogCard article={post} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
            <Link to="/blog">
              <Button
                variant="primary"
                className="py-2 px-4 text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-transform hover:scale-105 rounded-lg"
              >
                Latest Posts
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Back to Top Button */}
      {!blogLoading && (
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

export default HomePage;