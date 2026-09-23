import React from 'react';

const variants = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  primary: 'bg-primary-100 text-primary-700',
  neutral: 'bg-gray-100 text-gray-600',
};

/**
 * Small status pill.
 * Usage: <Badge variant="success">paid</Badge>
 */
const Badge = ({ children, variant = 'neutral', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium capitalize ${variants[variant] || variants.neutral} ${className}`}
    >
      {children}
    </span>
  );
};

export default React.memo(Badge);
