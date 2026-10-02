import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate' | 'violet';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  pulse = false,
}) => {
  const variantStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  }[variant];

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variantStyles} ${sizeStyles}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      {children}
    </span>
  );
};
