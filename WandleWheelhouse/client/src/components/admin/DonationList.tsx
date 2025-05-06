import React, { useState, useEffect, useCallback } from 'react';
import AdminService from '../../services/AdminService';
import { DonationResponseDto } from '../../dto/Donations/DonationResponseDto';
import { PaymentMethod } from '../../dto/Donations/PaymentMethodEnum';
import { PaymentStatus } from '../../dto/Donations/PaymentStatusEnum';
import PaginationControls from '../common/PaginationControls';
// import { Link } from 'react-router-dom';

const DonationList: React.FC = () => {
  // --- State ---
  const [donations, setDonations] = useState<DonationResponseDto[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchDonations = useCallback(async () => {
    setError(null);
    try {
      console.log(`Fetching ALL donations - Page: ${currentPage}`);
      const result = await AdminService.getAllDonations(currentPage, pageSize);
      setDonations(result.items);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
    } catch (err: unknown) {
      let message = 'Failed to load donations.';
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      setDonations([]);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize]);

  // Fetch data on mount and page change
  useEffect(() => {
    setIsLoading(true);
    fetchDonations();
  }, [fetchDonations]);

  // --- Handlers ---
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- Helpers ---
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // --- Render Logic ---
  if (isLoading && donations.length === 0) {
    return <p className="text-center p-4 text-gray-500">Loading donations...</p>;
  }
  if (error && donations.length === 0) {
    return <p className="text-center text-red-600 bg-red-100 p-3 rounded border border-red-200">{error}</p>;
  }

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
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Recurring?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {donations.length === 0 && !isLoading && (
            <tr>
              <td colSpan={6} className="text-center py-10 text-gray-500">
                No donations found.
              </td>
            </tr>
          )}
          {donations.map((donation) => (
            <tr key={donation.donationId} className="hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                {donation.userFullName || 'Anonymous'} <br />
                <span className="text-xs text-gray-500">{donation.donorEmail || 'No Email Recorded'}</span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                £{donation.amount.toFixed(2)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                {PaymentMethod[donation.method] || 'Unknown'}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm">
                <span
                  className={
                    donation.status === PaymentStatus.Success
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {PaymentStatus[donation.status] || 'Unknown'}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                {formatDate(donation.donationDate)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                {donation.isRecurring ? (
                  <span className="text-green-600 font-semibold">Yes</span>
                ) : (
                  <span className="text-gray-500">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

export default DonationList;