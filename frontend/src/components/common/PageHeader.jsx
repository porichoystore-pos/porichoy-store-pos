import React from 'react';

/**
 * Consistent page header: title + optional subtitle + action buttons.
 * Usage:
 *   <PageHeader title="Products" subtitle="128 items">
 *     <button className="btn-primary btn-sm">Add</button>
 *   </PageHeader>
 */
const PageHeader = ({ title, subtitle, children, className = '' }) => {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
};

export default React.memo(PageHeader);
