// src/components/common/PaginationControls.tsx
import React from 'react';
import Button from '../ui/Button'; // Use our Button component

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void; // Function to call when page changes
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null; // Don't render controls if only one page or less
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4 mt-8 py-4">
      <Button
        onClick={handlePrevious}
        disabled={currentPage <= 1}
        variant="secondary"
        className="py-1 px-3 text-sm"
      >
        &laquo; Previous
      </Button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        variant="secondary"
        className="py-1 px-3 text-sm"
      >
        Next &raquo;
      </Button>
    </div>
  );
};

export default PaginationControls;