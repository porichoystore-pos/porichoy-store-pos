import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Lock body scroll + close on Escape
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
    full: 'sm:max-w-7xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Bottom sheet on mobile, centered dialog on desktop */}
      <div className="flex items-end sm:items-center justify-center min-h-screen sm:p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] animate-backdrop"
          onClick={onClose}
        />

        <div
          className={`relative bg-white w-full ${sizes[size]} rounded-t-2xl sm:rounded-xl shadow-2xl animate-modal max-h-[92vh] overflow-y-auto pb-safe`}
        >
          <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-gray-100 rounded-t-2xl sm:rounded-t-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Close dialog"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 sm:px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;