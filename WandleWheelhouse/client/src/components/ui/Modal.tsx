// src/components/ui/Modal.tsx

import React from 'react';
import ReactModal from 'react-modal'; // Import the base modal library
import Button from './Button'; // Assuming Button component is in the same folder or path is adjusted

// Define the properties the Modal component will accept
interface ModalProps {
  isOpen: boolean;           // Controls if the modal is visible
  onRequestClose: () => void; // Function to call when modal should close (e.g., overlay click, Esc key)
  title?: string;            // Optional title displayed at the top
  children: React.ReactNode; // The content to display inside the modal
  contentLabel?: string;     // Required for accessibility (describes modal content to screen readers)
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onRequestClose,
  title,
  children,
  contentLabel = title || 'Modal Window', // Use title or a generic label for accessibility
}) => {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel={contentLabel}
      // --- Apply Styling using Tailwind ---
      // overlayClassName: Styles for the background overlay
      // className: Styles for the modal content container itself
      // Use the backdrop-blur version from the previous step:
      overlayClassName="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 outline-none"
      // --- End Styling ---
      // Standard modal behaviors
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      {/* Modal Header with Title and Close Button */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
        {title ? (
           <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        ) : (
            // Add an empty span to keep justify-between working if no title
             <span></span>
        )}
        <Button
          onClick={onRequestClose}
          variant="secondary" // Using secondary, could create a specific 'icon' or 'close' variant
          // Basic styling for a close 'X' button
          className="p-0 w-6 h-6 flex items-center justify-center text-xl font-bold text-gray-400 hover:text-gray-700 bg-transparent hover:bg-gray-200 rounded-full"
          aria-label="Close Modal" // Accessibility
        >
          &times; {/* HTML entity for 'x' symbol */}
        </Button>
      </div>

      {/* Modal Body - Render whatever children are passed */}
      <div>
        {children}
      </div>

    </ReactModal>
  );
};

export default Modal;