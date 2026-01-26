/**
 * ============================================
 * API State Components
 * ============================================
 * 
 * Reusable components for loading, error, and empty states.
 * Use these instead of showing fake/random data.
 */

'use client';

import React from 'react';

// ─────────────────────────────────────────────────────────────
// Loading State
// ─────────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
      />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );
}

interface LoadingCardProps {
  message?: string;
  height?: string;
}

export function LoadingCard({ message = 'Loading...', height = 'h-48' }: LoadingCardProps) {
  return (
    <div className={`${height} bg-white rounded-xl border border-gray-200 flex items-center justify-center`}>
      <LoadingSpinner message={message} />
    </div>
  );
}

export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

// Skeleton loaders
export function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-4 ${width} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonCard({ height = 'h-32' }: { height?: string }) {
  return (
    <div className={`${height} bg-white rounded-xl border border-gray-200 p-4 space-y-3`}>
      <SkeletonLine width="w-1/3" />
      <SkeletonLine width="w-2/3" />
      <SkeletonLine width="w-1/2" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Error State
// ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-xl p-6 text-center ${className}`}
    >
      <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">{title}</h3>
      <p className="text-sm text-red-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
  height?: string;
}

export function ErrorCard({ message, onRetry, height = 'h-48' }: ErrorCardProps) {
  return (
    <div className={`${height} bg-white rounded-xl border border-gray-200 flex items-center justify-center p-4`}>
      <ErrorState message={message} onRetry={onRetry} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon ? (
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          {icon}
        </div>
      ) : (
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface EmptyCardProps {
  title: string;
  description?: string;
  height?: string;
}

export function EmptyCard({ title, description, height = 'h-48' }: EmptyCardProps) {
  return (
    <div className={`${height} bg-white rounded-xl border border-gray-200 flex items-center justify-center`}>
      <EmptyState title={title} description={description} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// No Data Placeholder (for charts/metrics)
// ─────────────────────────────────────────────────────────────

interface NoDataProps {
  message?: string;
  inline?: boolean;
}

export function NoData({ message = 'No data available', inline = false }: NoDataProps) {
  if (inline) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[100px] text-gray-400 text-sm">
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Value Display (shows 0 or actual value, never fake)
// ─────────────────────────────────────────────────────────────

interface ValueDisplayProps {
  value: number | null | undefined;
  format?: 'currency' | 'percentage' | 'number';
  inMillions?: boolean;
  placeholder?: string;
  className?: string;
}

export function ValueDisplay({
  value,
  format = 'number',
  inMillions = false,
  placeholder = '—',
  className = '',
}: ValueDisplayProps) {
  if (value === null || value === undefined) {
    return <span className={`text-gray-400 ${className}`}>{placeholder}</span>;
  }

  let formatted: string;

  switch (format) {
    case 'currency':
      if (inMillions) {
        formatted = `LKR ${(value / 1e6).toFixed(1)}M`;
      } else {
        formatted = `LKR ${value.toLocaleString()}`;
      }
      break;
    case 'percentage':
      formatted = `${value.toFixed(1)}%`;
      break;
    default:
      formatted = value.toLocaleString();
  }

  return <span className={className}>{formatted}</span>;
}

// ─────────────────────────────────────────────────────────────
// API State Wrapper
// ─────────────────────────────────────────────────────────────

interface ApiStateWrapperProps<T> {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  data: T | null;
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: (data: T) => React.ReactNode;
}

export function ApiStateWrapper<T>({
  loading,
  error,
  isEmpty,
  data,
  loadingMessage = 'Loading...',
  emptyTitle = 'No data',
  emptyDescription,
  onRetry,
  children,
}: ApiStateWrapperProps<T>) {
  if (loading) {
    return <LoadingCard message={loadingMessage} />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={onRetry} />;
  }

  if (isEmpty || !data) {
    return <EmptyCard title={emptyTitle} description={emptyDescription} />;
  }

  return <>{children(data)}</>;
}
