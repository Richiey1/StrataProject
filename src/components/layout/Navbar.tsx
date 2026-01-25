"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/Button';

export const Navbar = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div className="md:hidden font-bold text-xl">StrataForge</div>
      <div className="ml-auto flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {user?.address}
            </span>
            <Button variant="outline" onClick={logout} className="text-sm py-1">
              Disconnect
            </Button>
          </>
        ) : (
          <Button onClick={login}>Connect Wallet</Button>
        )}
      </div>
    </header>
  );
};
