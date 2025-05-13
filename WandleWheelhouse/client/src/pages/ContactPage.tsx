// src/pages/ContactPage.tsx
// ... other imports like React, Link, Button ...
import React from 'react';
// import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext'; // <-- CORRECTED: Use useAuth and adjust path
import ContactForm from '../components/forms/ContactForm';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';

const ContactPage: React.FC = () => {
  const { openDonationModal } = useAuth(); // <-- Now correctly uses useAuth

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <header className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">Get In Touch</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          We'd love to hear from you! Whether you have a question, want to volunteer, book a tour,
          give feedback, or make a donation, here's how you can reach us.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Column: Contact Form Area */}
        <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Send us a Message</h2>
          <ContactForm />
        </section>

        {/* Right Column: Other Contact Methods */}
        <div className="space-y-8">
          {/* Donate Section */}
          <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Support Our Work</h2>
            <p className="text-gray-600 mb-4">
              Your generous donations help us continue our mission and support vital community projects. Every contribution makes a difference.
            </p>
            <Button
              variant="primary"
              onClick={openDonationModal} // This will now work
              className="w-full transition-transform hover:scale-105 py-3"
              aria-label="Make a donation to Wandle Wheelhouse"
            >
              Make a Donation
            </Button>
          </section>

          {/* Direct Email & Socials Section */}
          <section className="bg-white p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Other Ways to Connect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-1">Direct Email</h3>
                <p className="text-gray-600">
                  For specific inquiries, you can email us at:{' '}
                  <a
                    href="mailto:contact@wandlewheelhouse.org" // Replace with your actual email
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    contact@wandlewheelhouse.org
                  </a>
                </p>
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-2">Follow Us</h3>
                <div className="flex space-x-4 items-center">
                  <a href="https://facebook.com/yourpage" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-600 transition-colors duration-200 p-2 rounded-full hover:bg-indigo-50" aria-label="Wandle Wheelhouse on Facebook">
                    <FaFacebookF size={24} />
                  </a>
                  <a href="https://instagram.com/yourpage" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-indigo-600 transition-colors duration-200 p-2 rounded-full hover:bg-indigo-50" aria-label="Wandle Wheelhouse on Instagram">
                    <FaInstagram size={24} />
                  </a>
                  {/* Add other social links */}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;