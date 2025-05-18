// src/pages/PrivacyPolicyPage.tsx
import React from 'react';

const PrivacyPolicyPage: React.FC = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
    <p className="mb-2">Last updated: {new Date().toLocaleDateString()}</p>
    <p>Details about how we collect, use, and protect your data will go here...</p>
    {/* TODO: Add full privacy policy content */}
  </div>
);
export default PrivacyPolicyPage;