import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, Palette, Users, Settings, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/goatech-admin-hq" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">Maghgo<span className="text-blue-600">Admin</span></span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/goatech-admin-hq" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <LayoutDashboard className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/goatech-admin-hq/themes" className="flex items-center gap-3 px-3 py-2 text-blue-700 bg-blue-50 rounded-lg transition-colors">
            <Palette className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Themes</span>
          </Link>
          <Link href="/goatech-admin-hq/merchants" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Merchants</span>
          </Link>
          <Link href="/goatech-admin-hq/plans" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Pricing Plans</span>
          </Link>
          <Link href="/goatech-admin-hq/offers" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Promotions</span>
          </Link>
          <Link href="/goatech-admin-hq/settings" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button className="flex w-full items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            <LogOut className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
