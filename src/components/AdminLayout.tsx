import React from 'react';
import { SidebarNav } from './SidebarNav';

// TODO: Replace with real admin check (e.g., from context or session)
const isAdmin = true;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="p-8 rounded-xl shadow border bg-white text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-white relative">
      <main className="flex-1 px-0 md:px-8 py-8 relative">
        {children}
      </main>
      <aside className="w-72 border-l bg-white shadow-lg hidden md:flex flex-col px-6 py-8 relative">
        <SidebarNav />
      </aside>
    </div>
  );
}
