"use client";

import { cn } from "@buildingai/ui/lib/utils";
import type { ECharts, EChartsOption } from "echarts";
import { memo, useEffect, useRef, useState } from "react";

export type EchartsBlockProps = {
  option: Record<string, unknown>;
  className?: string;
  height?: number;
};

export const EchartsBlock = memo(function EchartsBlock({
  option,
  className,
  height = 320,
}: EchartsBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const optionJson = JSON.stringify(option);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const nextOption = JSON.parse(optionJson) as EChartsOption;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const echarts = await import("echarts");
        if (cancelled || !containerRef.current) {
          return;
        }
        if (!chartRef.current) {
          chartRef.current = echarts.init(containerRef.current);
        }
        chartRef.current.setOption(nextOption, true);
        resizeObserver = new ResizeObserver(() => {
          chartRef.current?.resize();
        });
        resizeObserver.observe(containerRef.current);
        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(err instanceof Error ? err.message : "Failed to render ECharts");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [optionJson]);

  return (
    <div
      className={cn(
        "border-border bg-background my-4 w-full overflow-hidden rounded-xl border",
        className,
      )}
      data-streamdown="echarts-block"
    >
      <div className="border-border text-muted-foreground flex h-8 items-center border-b px-3 text-xs">
        <span className="font-mono lowercase">echarts</span>
        {loading ? <span className="ml-auto text-xs">Loading…</span> : null}
        {error ? <span className="text-destructive ml-auto text-xs">{error}</span> : null}
      </div>
      <div ref={containerRef} style={{ height, width: "100%" }} />
    </div>
  );
});
