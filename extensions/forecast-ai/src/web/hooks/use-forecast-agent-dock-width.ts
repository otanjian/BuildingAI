import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export const FCST_AGENT_DOCK_WIDTH_KEY = "forecast-agent-dock-width";
export const FCST_AGENT_DOCK_WIDTH_DEFAULT = 400;
export const FCST_AGENT_DOCK_WIDTH_MIN = 280;
export const FCST_AGENT_DOCK_WIDTH_MAX = 900;

function readStoredDockWidth(): number {
    try {
        const raw = localStorage.getItem(FCST_AGENT_DOCK_WIDTH_KEY);
        const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
        if (
            Number.isFinite(parsed) &&
            parsed >= FCST_AGENT_DOCK_WIDTH_MIN &&
            parsed <= FCST_AGENT_DOCK_WIDTH_MAX
        ) {
            return parsed;
        }
    } catch {
        /* ignore */
    }
    return FCST_AGENT_DOCK_WIDTH_DEFAULT;
}

export function useForecastAgentDockWidth() {
    const [width, setWidth] = useState(readStoredDockWidth);
    const [resizing, setResizing] = useState(false);
    const widthRef = useRef(width);
    widthRef.current = width;

    const persistWidth = useCallback((value: number) => {
        try {
            localStorage.setItem(FCST_AGENT_DOCK_WIDTH_KEY, String(value));
        } catch {
            /* ignore */
        }
    }, []);

    const startResize = useCallback((clientX: number) => {
        const startX = clientX;
        const startWidth = widthRef.current;
        setResizing(true);
        document.body.classList.add("forecast-agent-dock-resizing");

        const onMove = (event: MouseEvent) => {
            const next = Math.min(
                FCST_AGENT_DOCK_WIDTH_MAX,
                Math.max(
                    FCST_AGENT_DOCK_WIDTH_MIN,
                    startWidth + (startX - event.clientX),
                ),
            );
            setWidth(next);
        };

        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.classList.remove("forecast-agent-dock-resizing");
            setResizing(false);
            persistWidth(widthRef.current);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [persistWidth]);

    useEffect(() => {
        return () => {
            document.body.classList.remove("forecast-agent-dock-resizing");
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
