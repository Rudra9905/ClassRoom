import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
