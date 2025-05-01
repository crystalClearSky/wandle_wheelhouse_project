import React from 'react';
import { Outlet } from 'react-router-dom'; // Used to render child routes

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Placeholder for Floating Navigation Bar */}
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        {/* Basic Nav Structure - Will be replaced later */}
        <nav className="container mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">Wandle Wheelhouse</div>
          <div>
            {/* Placeholder links */}
            <span className="mx-2">Home</span>
            <span className="mx-2">Mission</span>
            <span className="mx-2">Blog</span>
            <span className="mx-2">Login</span>
            <span className="mx-2 font-semibold bg-yellow-400 text-blue-800 px-3 py-1 rounded hover:bg-yellow-300 cursor-pointer">Donate</span>
          </div>
        </nav>
      </header>

      {/* Main content area where routed pages will be rendered */}
      {/* Added container/padding for better spacing */}
      <main className="flex-grow container mx-auto py-8 px-4">
        <Outlet /> {/* Child routes render here */}
      </main>

      {/* Placeholder for Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
        © {new Date().getFullYear()} Wandle Wheelhouse. All rights reserved.
        {/* Add footer content here */}
      </footer>
    </div>
  );
};

export default Layout;