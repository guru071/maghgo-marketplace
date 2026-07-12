import React from 'react';

export const metadata = {
  title: 'Privacy Policy | Maghgo',
  description: 'Privacy Policy for Maghgo',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <div className="prose prose-blue max-w-none text-gray-600">
          <p className="mb-4">Last updated: July 12, 2026</p>
          
          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us, including when you create an account, build a store, or communicate with our chatbot via WhatsApp, Instagram, or Facebook Messenger. This may include your phone number, social media ID, and store details.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to operate and improve our platform, process your transactions, and communicate with you about your store and our services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Data Sharing and Meta Integrations</h2>
          <p className="mb-4">
            Because our service operates via Meta's platforms (WhatsApp, Instagram, Messenger), your interactions are also subject to Meta's privacy policies. We do not sell your personal data to third parties.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
}
