import { useInfiniteScrollTopContext } from "@buildingai/ui/components/infinite-scroll-top";
import { useEffect } from "react";

export function ConversationScrollMemory(props: {
  memoryKey?: string;
  value?: { top: number; atBottom: boolean };
  onChange?: (value: { top: number; atBottom: boolean }) => void;
}) {
  const { scrollRef } = useInfiniteScrollTopContext();

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !props.memoryKey) return;
    if (props.value && !props.value.atBottom) {
      element.scrollTop = props.value.top;
    }
    let frame = 0;
    const record = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        props.onChange?.({
          top: element.scrollTop,
          atBottom: element.scrollHeight - element.scrollTop - element.clientHeight <= 8,
        });
      });
    };
    element.addEventListener("scroll", record, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("scroll", record);
      props.onChange?.({
        top: element.scrollTop,
        atBottom: element.scrollHeight - element.scrollTop - element.clientHeight <= 8,
      });
    };
  }, [props.memoryKey, scrollRef]);

  return null;
}
