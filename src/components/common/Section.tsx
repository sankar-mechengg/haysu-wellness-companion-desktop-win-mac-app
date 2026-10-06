import type { ReactNode } from "react";

/** Settings page header. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-0.5">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** A group of rows inside a card, separated by hairlines. */
export function Rows({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border/60 dark:divide-border-dark/60 [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      {children}
    </div>
  );
}
