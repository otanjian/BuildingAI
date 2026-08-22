export function fixedRowVirtualRange(input: {
  count: number;
  rowHeight: number;
  viewportHeight: number;
  scrollTop: number;
  overscan: number;
}): { start: number; end: number } {
  const first = Math.floor(Math.max(0, input.scrollTop) / input.rowHeight);
  const visible = Math.ceil(input.viewportHeight / input.rowHeight);
  return {
    start: Math.max(0, first - input.overscan),
    end: Math.min(input.count, first + visible + input.overscan),
  };
}
