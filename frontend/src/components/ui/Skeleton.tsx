import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'text-sm' | 'image' | 'button';
  className?: string;
}

export default function Skeleton({ variant = 'text', className = '' }: SkeletonProps) {
  return <div className={`skeleton skeleton--${variant} ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton--card">
      <div className="skeleton skeleton--image" />
      <div className="skeleton__body">
        <div className="skeleton skeleton--text" />
        <div className="skeleton skeleton--text-sm" />
        <div className="skeleton skeleton--button" />
      </div>
    </div>
  );
}
