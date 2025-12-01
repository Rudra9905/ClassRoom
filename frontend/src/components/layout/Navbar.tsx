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
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onToggleSidebar}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary-600 text-sm font-semibold text-white flex items-center justify-center">
            SC
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Smart Classroom
          </span>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium text-slate-900">{user.name}</div>
            <div className="text-slate-500 capitalize text-[11px]">{user.role.toLowerCase()}</div>
          </div>
          <Avatar name={user.name} size="sm" />
          <Button variant="ghost" onClick={logout} className="text-xs">
            Logout
          </Button>
        </div>
      )}
    </header>
  );
};
