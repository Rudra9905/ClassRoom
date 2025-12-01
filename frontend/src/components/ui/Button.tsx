import React from 'react';
import clsx from 'clsx';

const baseClasses =
  'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-soft',
  secondary:
    'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

export type ButtonVariant = keyof typeof variants;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  fullWidth,
  ...props
}) => {
  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
