import { type ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`glass rounded-3xl py-12 px-6 text-center flex flex-col items-center gap-3 ${className}`}>
      {icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary"
          style={{ background: "var(--color-primary-tint)" }}
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        {description && <div className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">{description}</div>}
      </div>
      {action}
    </div>
  );
}
