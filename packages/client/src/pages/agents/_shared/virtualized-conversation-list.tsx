import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useRef } from "react";

export function VirtualizedConversationList<T>(props: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: props.items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 5,
    getItemKey: (index) => props.getKey(props.items[index]),
  });

  return (
    <div ref={scrollRef} className={props.className ?? "h-full overflow-auto"}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((row) => {
          const item = props.items[row.index];
          return (
            <div
              key={row.key}
              className="absolute top-0 left-0 w-full"
              style={{ height: `${row.size}px`, transform: `translateY(${row.start}px)` }}
            >
              {props.renderItem(item)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
