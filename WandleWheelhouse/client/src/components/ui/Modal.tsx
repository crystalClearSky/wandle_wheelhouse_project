import React from 'react';
import ReactModal from 'react-modal';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  title?: string;
  children: React.ReactNode;
  contentLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onRequestClose,
  title,
  children,
  contentLabel = title || 'Modal Window',
}) => {
  // Disable scroll when modal opens
  const handleAfterOpen = () => {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  };

  // Restore scroll when modal closes
  const handleAfterClose = () => {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  };

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      onAfterOpen={handleAfterOpen}
      onAfterClose={handleAfterClose}
      contentLabel={contentLabel}
      overlayClassName={{
        base: 'fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 opacity-0 transition-opacity duration-150 ease-out',
        afterOpen: 'opacity-100',
        beforeClose: 'opacity-0 transition-opacity duration-100 ease-out',
      }}
      className={{
        base: 'relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 outline-none opacity-0 scale-95 translate-y-4 transition-all duration-150 ease-out',
        afterOpen: 'opacity-100 scale-100 translate-y-0',
        beforeClose: 'opacity-0 scale-95 translate-y-4 transition-all duration-100 ease-out',
      }}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      closeTimeoutMS={100} // Match faster exit duration
    >
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
        {title ? (
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        ) : (
          <span></span>
        )}
        <Button
          onClick={onRequestClose}
          variant="secondary"
          className="p-0 w-6 h-6 flex items-center justify-center text-xl font-bold text-gray-400 hover:text-gray-700 bg-transparent hover:bg-gray-200 rounded-full"
          aria-label="Close Modal"
        >
          ×
        </Button>
      </div>
      <div>{children}</div>
    </ReactModal>
  );
};

export default Modal;