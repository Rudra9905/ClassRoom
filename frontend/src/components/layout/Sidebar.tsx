import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  RectangleStackIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

// Sidebar navigation contains only top-level sections. Class-specific chat
// is available inside each classroom detail page (Chat tab), so we do not
// show a separate global "Chat" item here.
const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/classes', label: 'Classes', icon: RectangleStackIcon },
  { to: '/assignments', label: 'Assignments', icon: ClipboardDocumentListIcon },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white pt-16 shadow-lg transition-transform lg:static lg:translate-x-0 lg:shadow-none`}
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <nav className="flex h-full flex-col gap-1 border-r border-slate-100 px-4 pb-6 pt-4 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
              onClick={onClose}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};
