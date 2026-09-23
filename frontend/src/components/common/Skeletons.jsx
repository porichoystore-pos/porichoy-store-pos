import React from 'react';

// Shared shimmer primitive
const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Generic page-level skeleton (used as Suspense fallback for lazy routes)
export const PageSkeleton = () => (
  <div className="px-3 py-4 space-y-4">
    <div className="flex items-center justify-between">
      <Pulse className="h-7 w-36" />
      <Pulse className="h-9 w-24 rounded-lg" />
    </div>
    <Pulse className="h-10 w-full rounded-lg" />
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <Pulse className="aspect-square rounded-none" />
          <div className="p-2 space-y-2">
            <Pulse className="h-3 w-full" />
            <Pulse className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Product grid skeleton (Products page)
export const ProductGridSkeleton = () => (
  <div className="px-3 py-4">
    <div className="flex items-center justify-between mb-4">
      <Pulse className="h-7 w-28" />
      <div className="flex gap-2">
        <Pulse className="h-9 w-20 rounded-lg" />
        <Pulse className="h-9 w-20 rounded-lg" />
      </div>
    </div>
    <Pulse className="h-10 w-full rounded-lg mb-4" />
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
          <Pulse className="aspect-square rounded-none" />
          <div className="p-2 space-y-2">
            <Pulse className="h-3 w-full" />
            <Pulse className="h-3 w-1/2" />
            <Pulse className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Simple row-list skeleton (Bills, Customers)
export const ListSkeleton = ({ rows = 8 }) => (
  <div className="px-3 py-4">
    <div className="flex items-center justify-between mb-4">
      <Pulse className="h-7 w-28" />
      <Pulse className="h-9 w-9 rounded-lg" />
    </div>
    <Pulse className="h-10 w-full rounded-lg mb-3" />
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex justify-between items-center mb-2">
            <Pulse className="h-4 w-32" />
            <Pulse className="h-3 w-20" />
          </div>
          <div className="flex justify-between items-center">
            <Pulse className="h-3 w-24" />
            <Pulse className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Card grid skeleton (Categories)
export const CardGridSkeleton = ({ cards = 6 }) => (
  <div className="px-3 py-4">
    <div className="flex items-center justify-between mb-4">
      <Pulse className="h-7 w-32" />
      <Pulse className="h-9 w-20 rounded-lg" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 space-y-2">
          <div className="flex justify-between">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-4 w-10" />
          </div>
          <Pulse className="h-3 w-full" />
          <Pulse className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="px-3 py-4 space-y-4">
    <div className="flex items-center justify-between">
      <Pulse className="h-7 w-32" />
      <Pulse className="h-9 w-9 rounded-lg" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
          <Pulse className="h-3 w-20 mb-2" />
          <Pulse className="h-5 w-16" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <Pulse className="h-4 w-32 mb-3" />
      <Pulse className="h-40 w-full" />
    </div>
    <div className="bg-white rounded-lg border border-gray-100 p-3 space-y-2">
      <Pulse className="h-4 w-28 mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Pulse key={i} className="h-10 w-full" />
      ))}
    </div>
  </div>
);
