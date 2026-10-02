import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  const variantStyles = {
    primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 active:scale-[0.98] focus:ring-brand-500 border border-brand-400/30",
    secondary: "bg-surface-800 hover:bg-surface-700 text-slate-100 border border-slate-700/80 active:scale-[0.98] focus:ring-slate-500",
    outline: "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border border-slate-700 active:scale-[0.98] focus:ring-slate-500",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-[0.98] focus:ring-rose-500",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white active:scale-[0.98]",
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
};
