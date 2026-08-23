export function TodoSidebarBadge({ count, isLoading }: { count?: number; isLoading: boolean }) {
  if (isLoading) {
    return <span aria-label="待办数量加载中" className="bg-muted h-4 w-6 animate-pulse rounded-full" />;
  }
  if (!count) return null;
  return (
    <span
      aria-label={`${count} 项进行中待办`}
      className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
