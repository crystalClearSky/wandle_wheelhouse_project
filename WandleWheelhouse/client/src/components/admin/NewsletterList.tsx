// Location: src/components/admin/NewsletterList.tsx

import React, { useState, useEffect, useCallback } from 'react';
import AdminService from '../../services/AdminService';
import { NewsletterSubscriptionResponseDto } from '../../dto/Newsletter/NewsletterSubscriptionRequestDto'; // Use the correct DTO
import PaginationControls from '../common/PaginationControls';

const NewsletterList: React.FC = () => {
  // --- State ---
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscriptionResponseDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20); // Show more emails per page
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchSubscribers = useCallback(async () => {
    // Clear error on refetch/page change
    setError(null);
    try {
      console.log(`Workspaceing ALL newsletter subscribers - Page: ${currentPage}`);
      const result = await AdminService.getAllNewsletterSubscriptions(currentPage, pageSize);
      setSubscriptions(result.items);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
    } catch (err: unknown) {
      let message = 'Failed to load newsletter subscribers.';
      if (err instanceof Error) { message = err.message; }
      setError(message);
      setSubscriptions([]); // Clear data on error
      setTotalPages(0);
    } finally {
      setIsLoading(false); // Done loading
    }
  }, [currentPage, pageSize]); // Depend on page and size

  // Fetch on mount and page change
  useEffect(() => {
    setIsLoading(true); // Set loading true when fetching
    fetchSubscribers();
  }, [fetchSubscribers]); // Use memoized function

  // --- Handlers ---
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper to format dates
  const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
          // Show date and time
          return new Date(dateString).toLocaleString('en-GB', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
          });
      } catch { return 'Invalid Date'; }
  };

  // --- Render Logic ---
  if (isLoading && subscriptions.length === 0) return <p className="text-center p-4 text-gray-500">Loading subscribers...</p>;
  if (error && subscriptions.length === 0) return <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200">{error}</p>;

  return (
     <div className="overflow-x-auto">
        {/* Optional: Show loading indicator during refetches */}
        {isLoading && <p className="text-center text-blue-500 text-sm mb-2">Loading...</p>}

         <table className="min-w-full bg-white border border-gray-200 shadow rounded">
           <thead className="bg-gray-50 border-b border-gray-200">
             <tr>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subscribed Email</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subscription Date</th>
               {/* Add Actions column later if needed (e.g., delete subscriber?) */}
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
              {/* Handle Empty State */}
              {subscriptions.length === 0 && !isLoading && (
                  <tr><td colSpan={2} className="text-center py-10 text-gray-500">No newsletter subscribers found.</td></tr>
              )}
              {/* Map Through Subscriptions */}
             {subscriptions.map((sub) => (
               <tr key={sub.newsletterSubscriptionId} className="hover:bg-gray-50">
                 <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800">{sub.email}</td>
                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(sub.subscriptionDate)}</td>
                 {/* Action cell placeholder */}
                 {/* <td></td> */}
               </tr>
             ))}
           </tbody>
         </table>
         {/* Pagination Controls */}
         {totalPages > 1 && (
             <PaginationControls
               currentPage={currentPage}
               totalPages={totalPages}
               onPageChange={handlePageChange}
             />
         )}
     </div>
   );
};

export default NewsletterList;