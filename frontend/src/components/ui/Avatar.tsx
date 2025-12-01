import React from 'react';
import clsx from 'clsx';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  }[size];

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700',
        sizeClasses
      )}
    >
      {initials}
    </div>
  );
};
