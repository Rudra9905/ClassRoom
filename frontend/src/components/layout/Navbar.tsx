import React from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--card)_90%,var(--background)_10%)] px-4 shadow-sm backdrop-blur lg:px-6 transition-colors duration-300">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onToggleSidebar}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Brand similar to Google Classroom */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-semibold text-white shadow-sm">
            SC
          </div>
          <span className="text-base font-medium tracking-tight text-[var(--text)]">
            Classroom
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium text-[var(--text)]">{user.name}</div>
            <div className="text-[11px] capitalize text-[var(--text-secondary)] opacity-80">
              {user.role.toLowerCase()}
            </div>
          </div>
          <Avatar name={user.name} size="sm" />
          <Button variant="ghost" size="sm" onClick={logout} className="text-xs">
            Logout
          </Button>
        </div>
      )}
    </header>
  );
};
