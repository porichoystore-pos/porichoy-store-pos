import React from 'react';
import { FiInbox } from 'react-icons/fi';

/**
 * Consistent empty state for lists/grids.
 * Usage:
 *   <EmptyState icon={FiPackage} title="No products found"
 *     description="Try a different search" action={<button className="btn-primary">Add</button>} />
 */
const EmptyState = ({ icon: Icon = FiInbox, title, description, action }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 py-12 px-4 text-center animate-fade-in">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
};

export default React.memo(EmptyState);
