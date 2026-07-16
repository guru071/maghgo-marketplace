import React from 'react';

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: string;
}

/**
 * Honest placeholder for dashboard features that are not built yet.
 * Shows no fabricated data and makes clear the merchant is not charged for it.
 */
export default function ComingSoon({ title, description, icon = '🚧' }: ComingSoonProps) {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 mb-8">{description}</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-sm text-center">
        <div className="text-6xl mb-4">{icon}</div>
        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
          Coming soon
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">This feature is on the way</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          We&apos;re actively building this. It isn&apos;t available yet — and you won&apos;t be charged
          for it until it ships. In the meantime, everything in your Inventory, Settings, and Billing works today.
        </p>
      </div>
    </div>
  );
}
