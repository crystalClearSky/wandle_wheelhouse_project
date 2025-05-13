// src/components/Footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import NewsletterSignupForm from './newsletter/NewsletterSignupForm'; // Import the form

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-gray-300 p-8 md:p-12 mt-auto">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Column 1: About/Contact Info */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-white">Wandle Wheelhouse</h3>
          <p className="text-sm mb-2">Your address here, Croydon</p>
          <p className="text-sm mb-2">Email: info@wandlewheelhouse.org</p>
          <p className="text-sm">Phone: 020 XXXX XXXX</p>
          {/* Add Social Media Links here later */}
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-white">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li><a href="/mission" className="hover:text-white">Our Mission</a></li>
            <li><a href="/blog" className="hover:text-white">Blog</a></li>
            <li><a href="#" className="hover:text-white">Get Involved</a></li>
            <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact Us</Link></li>
            {/* Add other relevant links */}
          </ul>
        </div>

        {/* Column 3: Newsletter Signup */}
        <div>
          {/* Use the Newsletter form component */}
          <NewsletterSignupForm />
        </div>

      </div>
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-700">
        © {new Date().getFullYear()} Wandle Wheelhouse. All rights reserved. | Charity No: XXXXXXX
      </div>
    </footer>
  );
};

export default Footer;