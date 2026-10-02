import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
  ...props
}) => {
  return (
    <div
      className={`bg-surface-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl transition-all duration-300 ${
        glow ? 'hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/5' : 'hover:border-slate-700/80'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
