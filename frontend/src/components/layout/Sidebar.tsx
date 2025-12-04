import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  AcademicCapIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { Classroom } from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { classroomApi } from '../../services/classroomApi';

const primaryNav = [
  { to: '/dashboard', label: 'Home', icon: HomeIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarDaysIcon },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [enrolledOpen, setEnrolledOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoadingClasses(true);
      try {
        // Use the same logic as ClassesPage so the list here matches "My classes".
        const data = await classroomApi.getClassrooms(
          user.role === 'TEACHER'
            ? { teacherId: user.id }
            : { studentId: user.id }
        );
        setClasses(data);
      } catch (e) {
        console.error('Failed to load sidebar classes', e);
      } finally {
        setLoadingClasses(false);
      }
    };
    load();
  }, [user]);

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
    return (parts[0]![0] + parts[1]![0]).toUpperCase();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Left navigation rail styled like Google Classroom */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white pt-16 shadow-lg transition-transform lg:static lg:translate-x-0 lg:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex h-full flex-col justify-between border-r border-slate-100 px-3 pb-4 pt-4 text-sm">
          <div className="space-y-4">
            {/* Top navigation (Home, Calendar, Gemini) */}
            <div className="space-y-1">
              {primaryNav.map((item) => (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                  onClick={onClose}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Enrolled section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setEnrolledOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-full border px-3 py-2 text-left text-sm font-medium shadow-sm transition-colors ${
                  enrolledOpen
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-3">
                  <AcademicCapIcon className="h-5 w-5 text-slate-600" />
                  <span>Enrolled</span>
                </span>
                <ChevronRightIcon
                  className={`h-4 w-4 text-slate-400 transition-transform ${
                    enrolledOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {enrolledOpen && (
                <div className="mt-2 space-y-1 pl-1">
                  {loadingClasses && (
                    <div className="rounded-full bg-slate-50 px-3 py-2 text-xs text-slate-400">
                      Loading classes...
                    </div>
                  )}
                  {!loadingClasses && (!classes || classes.length === 0) && (
                    <div className="rounded-full px-3 py-2 text-xs text-slate-400">
                      No classes yet.
                    </div>
                  )}
                  {classes?.map((c) => (
                    <NavLink
                      key={c.id}
                      to={`/class/${c.id}`}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-sky-50 text-sky-700'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                      onClick={onClose}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{c.teacherName}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* To-do entry */}
            <div className="pt-2">
              <NavLink
                to="/assignments"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-full px-3 py-2 font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
                onClick={onClose}
              >
                <ClipboardDocumentListIcon className="h-5 w-5" />
                <span>To-do</span>
              </NavLink>
            </div>
          </div>

          {/* Bottom section */}
          <div className="space-y-1 border-t border-slate-100 pt-3 text-xs">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              onClick={onClose}
            >
              <Cog6ToothIcon className="h-4 w-4" />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
};
