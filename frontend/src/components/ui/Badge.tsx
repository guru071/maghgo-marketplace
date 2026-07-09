import React from 'react';

interface BadgeProps {
  variant?: 'coral' | 'green' | 'muted';
  children: React.ReactNode;
}

export default function Badge({ variant = 'coral', children }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
