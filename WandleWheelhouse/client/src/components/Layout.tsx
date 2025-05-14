import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";
import BlogService from "../services/BlogService";

const Layout: React.FC = () => {
  const { pathname } = useLocation();
  const [hasBlogArticles, setHasBlogArticles] = useState<boolean | null>(null);

  // Fetch whether blog articles exist when on /blog
  useEffect(() => {
    if (pathname === "/blog") {
      const checkArticles = async () => {
        try {
          // Assume BlogService.hasArticles returns a boolean
          const result = await BlogService.hasArticles();
          setHasBlogArticles(result);
        } catch (err) {
          console.error("Failed to check blog articles:", err);
          setHasBlogArticles(false); // Fallback to no articles
        }
      };
      checkArticles();
    } else {
      setHasBlogArticles(null); // Reset for non-blog routes
    }
  }, [pathname]);

  // Apply shift for routes where navbar is fixed (ignoring isScrolled)
  const isShiftedRoute = ["/profile", "/dashboard", "/contact"].includes(
    pathname
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar with fixed positioning */}
      <Navbar hasBlogArticles={hasBlogArticles} />

      {/* Main content area */}
      <main className="grow pt-0 md:pt-0">
        <div
          className={`pt-0 sm:pt-0 md:pt-0 lg:pt-0 ${
            isShiftedRoute ? "mt-[10vh]" : ""
          }`}
        >
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Layout;