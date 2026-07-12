'use client';

import React from 'react';

export default function ReportsPage() {
  const handleDownload = () => {
    // Generate a mock CSV
    const csvContent = "data:text/csv;charset=utf-8,Order ID,Date,Amount,Status\n1001,2026-07-10,₹1499,Delivered\n1002,2026-07-11,₹299,Processing\n1003,2026-07-12,₹4500,Shipped";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "maghgo_orders_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Custom Reports</h1>
      <p className="text-gray-600 mb-8">Generate and export detailed CSV reports of your sales and inventory data.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Available Reports</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-accent/50 transition-colors">
            <div>
              <h3 className="font-bold text-gray-900">Full Orders Export</h3>
              <p className="text-sm text-gray-500">All historical orders with customer details and statuses.</p>
            </div>
            <button onClick={handleDownload} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
              Download CSV
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-accent/50 transition-colors">
            <div>
              <h3 className="font-bold text-gray-900">Inventory Status</h3>
              <p className="text-sm text-gray-500">Current stock levels, pricing, and availability.</p>
            </div>
            <button onClick={handleDownload} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
              Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
