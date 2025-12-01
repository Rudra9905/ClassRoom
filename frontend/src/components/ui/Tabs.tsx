import React from 'react';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange }) => {
  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex gap-6 overflow-x-auto text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={clsx(
              'whitespace-nowrap border-b-2 pb-3 font-medium transition-colors',
              activeId === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
