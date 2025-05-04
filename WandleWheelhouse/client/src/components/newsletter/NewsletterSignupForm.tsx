// src/components/newsletter/NewsletterSignupForm.tsx
import React, { useState, FormEvent } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import NewsletterService from '../../services/NewsletterService';

const NewsletterSignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setIsError(false);

    const result = await NewsletterService.subscribe(email);

    setMessage(result.message);
    setIsError(!result.success);

    if (result.success) {
      setEmail(''); // Clear input on success
    }

    setIsLoading(false);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Stay Updated</h3>
      <p className="text-sm text-gray-600 mb-3">Subscribe to our newsletter for updates and news.</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
         {/* Reduced margin bottom on input for form context */}
        <Input
          id="newsletter-email"
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="flex-grow mb-0" // Override default margin bottom
          aria-label="Newsletter email input" // Accessibility
        />
        <Button
          type="submit"
          disabled={isLoading}
          variant="primary"
          className="py-2 px-4 whitespace-nowrap" // Adjusted padding/whitespace
        >
          {isLoading ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </form>
      {message && (
        <p className={`mt-2 text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>)}
    </div>
  );
};

export default NewsletterSignupForm;