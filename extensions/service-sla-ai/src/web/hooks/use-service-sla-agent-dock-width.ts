import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export const SLA_AGENT_DOCK_WIDTH_KEY = "service-sla-agent-dock-width";
export const SLA_AGENT_DOCK_WIDTH_DEFAULT = 400;
export const SLA_AGENT_DOCK_WIDTH_MIN = 280;
export const SLA_AGENT_DOCK_WIDTH_MAX = 900;

function readStoredDockWidth(): number {
    try {
        const raw = localStorage.getItem(SLA_AGENT_DOCK_WIDTH_KEY);
        const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
        if (
            Number.isFinite(parsed) &&
            parsed >= SLA_AGENT_DOCK_WIDTH_MIN &&
            parsed <= SLA_AGENT_DOCK_WIDTH_MAX
        ) {
            return parsed;
        }
    } catch {
        /* ignore */
    }
    return SLA_AGENT_DOCK_WIDTH_DEFAULT;
}

export function useServiceSlaAgentDockWidth() {
    const [width, setWidth] = useState(readStoredDockWidth);
    const [resizing, setResizing] = useState(false);
    const widthRef = useRef(width);
    widthRef.current = width;

    const persistWidth = useCallback((value: number) => {
        try {
            localStorage.setItem(SLA_AGENT_DOCK_WIDTH_KEY, String(value));
        } catch {
            /* ignore */
        }
    }, []);

    const startResize = useCallback((clientX: number) => {
        const startX = clientX;
        const startWidth = widthRef.current;
        setResizing(true);
        document.body.classList.add("service-sla-agent-dock-resizing");

        const onMove = (event: MouseEvent) => {
            const next = Math.min(
                SLA_AGENT_DOCK_WIDTH_MAX,
                Math.max(
                    SLA_AGENT_DOCK_WIDTH_MIN,
                    startWidth + (startX - event.clientX),
                ),
            );
            setWidth(next);
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.classList.remove("service-sla-agent-dock-resizing");
            setResizing(false);
            persistWidth(widthRef.current);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [persistWidth]);

    useEffect(() => {
        return () => {
            document.body.classList.remove("service-sla-agent-dock-resizing");
        };
    }, []);

    const onResizePointerDown = useCallback(
        (event: PointerEvent<HTMLDivElement>) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            startResize(event.clientX);
        },
        [startResize],
    );

    return { width, resizing, onResizePointerDown };
}
