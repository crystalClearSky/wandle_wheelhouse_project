// src/pages/TermsOfServicePage.tsx
import React from 'react';

const TermsOfServicePage: React.FC = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
    <p className="mb-2">Last updated: {new Date().toLocaleDateString()}</p>
    <p>The terms and conditions for using our website and services will go here...</p>
    {/* TODO: Add full terms of service content */}
  </div>
);
export default TermsOfServicePage;