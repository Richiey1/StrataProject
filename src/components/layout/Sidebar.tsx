"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar = () => {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/token-creator', label: 'Token Creator', icon: '🪙' },
    { href: '/dashboard/campaigns', label: 'Campaigns', icon: '📢' },
    { href: '/dashboard/airdrops', label: 'Airdrops', icon: '🪂' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen p-4 hidden md:block">
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold text-blue-600">StrataForge</h1>
      </div>
      <nav className="space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
