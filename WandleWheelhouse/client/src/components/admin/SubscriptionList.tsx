// src/components/admin/SubscriptionList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import AdminService from '../../services/AdminService';
import { SubscriptionResponseDto } from '../../dto/Subscriptions/SubscriptionResponseDto';
import { SubscriptionStatus } from '../../dto/Subscriptions/SubscriptionStatusEnum';
import { PaymentMethod } from '../../dto/Donations/PaymentMethodEnum';
import PaginationControls from '../common/PaginationControls';
// Import Button if you plan to add admin actions later (like manual cancel/pause)
// import Button from '../ui/Button';

const SubscriptionList: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponseDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15); // Can show more per page
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function
  const fetchSubscriptions = useCallback(async () => {
    setError(null);
    try {
      console.log(`Workspaceing ALL subscriptions - Page: ${currentPage}`);
      const result = await AdminService.getAllSubscriptions(currentPage, pageSize);
      setSubscriptions(result.items);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
    } catch (err: unknown) {
      let message = 'Failed to load subscriptions.';
      if (err instanceof Error) { message = err.message; }
      setError(message);
      setSubscriptions([]); setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  // Fetch data on mount and page change
  useEffect(() => {
    setIsLoading(true);
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Handler for page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- Helpers (borrowed from SubscriptionPage) ---
  const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try { return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
      catch { return 'Invalid Date'; }
  }
  const getStatusText = (status: SubscriptionStatus, cancelDate: string | null | undefined): React.ReactNode => {
       switch (status) {
          case SubscriptionStatus.Active: return <span className="text-green-600 font-semibold">Active</span>;
          case SubscriptionStatus.Cancelled: return <span className="text-red-600 font-semibold">Cancelled</span>;
          case SubscriptionStatus.CancellationPending: return <span className="text-yellow-600 font-semibold">Pending Cancel ({formatDate(cancelDate)})</span>;
          case SubscriptionStatus.PaymentFailed: return <span className="text-red-600 font-semibold">Payment Failed</span>;
          case SubscriptionStatus.Paused: return <span className="text-gray-600 font-semibold">Paused</span>;
          default: return <span className="text-gray-500">Unknown ({status})</span>;
       }
   }
  // --- End Helpers ---

  // --- Render Logic ---
  if (isLoading && subscriptions.length === 0) return <p className="text-center p-4 text-gray-500">Loading subscriptions...</p>;
  if (error && subscriptions.length === 0) return <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200">{error}</p>;

  return (
     <div className="overflow-x-auto">
        {isLoading && <p className="text-center text-blue-500 text-sm mb-2">Loading...</p>}
         <table className="min-w-full bg-white border border-gray-200 shadow rounded">
           <thead className="bg-gray-50 border-b border-gray-200">
             <tr>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Method</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</th>
               <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Next/End Date</th>
               {/* <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th> */}
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-200">
              {subscriptions.length === 0 && !isLoading && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No subscriptions found.</td></tr>
              )}
             {subscriptions.map((sub) => (
               <tr key={sub.subscriptionId} className="hover:bg-gray-50">
               
                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">£{sub.monthlyAmount.toFixed(2)}</td>
                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{PaymentMethod[sub.method]}</td>
                 <td className="px-4 py-2 whitespace-nowrap text-sm">{getStatusText(sub.status, sub.cancellationDate)}</td>
                 <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(sub.startDate)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                      {sub.status === SubscriptionStatus.Active ? formatDate(sub.nextPaymentDate) :
                       sub.status === SubscriptionStatus.CancellationPending ? formatDate(sub.cancellationDate) :
                       'N/A'}
                  </td>
                  {/* <td className="px-4 py-2 whitespace-nowrap text-sm font-medium space-x-2"> */}
                      {/* Placeholder for potential admin actions like cancel/pause */}
                      {/* <Button variant="secondary" size="sm" className="text-xs py-1 px-2">Manage</Button> */}
                  {/* </td> */}
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

export default SubscriptionList;