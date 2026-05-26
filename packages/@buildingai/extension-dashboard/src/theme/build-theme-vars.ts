import type { CSSProperties } from "react";

const KPI_SLOT_COUNT = 6;

/** Per-app theme from registry `hue`; drives gradients, KPI accents, charts. */
export function buildDashboardThemeVars(hue: number): CSSProperties {
    const primary = `hsl(${hue} 78% 48%)`;
    const primaryMuted = `hsl(${hue} 62% 93%)`;
    const primaryDark = `hsl(${hue} 62% 28%)`;
    const primaryGlow = `hsl(${hue} 75% 55%)`;

    const vars: Record<string, string> = {
        "--dash-primary": primary,
        "--dash-primary-muted": primaryMuted,
        "--dash-primary-dark": primaryDark,
        "--dash-primary-glow": primaryGlow,
        "--dash-surface": "#ffffff",
        "--dash-border": `hsl(${hue} 28% 88%)`,
        "--dash-muted": "hsl(215 18% 42%)",
        "--dash-title": `hsl(${hue} 45% 18%)`,
        "--dash-subtitle": "hsl(215 14% 46%)",
        "--dash-kpi-shadow": `0 8px 24px hsl(${hue} 45% 35% / 0.14), 0 2px 6px hsl(${hue} 30% 20% / 0.06)`,
        "--dash-panel-shadow": `0 4px 20px hsl(${hue} 35% 30% / 0.08)`,
        "--dash-bg": `linear-gradient(
            165deg,
            hsl(${hue} 52% 97%) 0%,
            hsl(220 40% 98%) 38%,
            hsl(${(hue + 40) % 360} 42% 96%) 100%
        )`,
        "--dash-hero-gradient": `linear-gradient(
            135deg,
            hsl(${hue} 72% 52%) 0%,
            hsl(${(hue + 24) % 360} 68% 42%) 55%,
            hsl(${hue} 58% 32%) 100%
        )`,
        "--dash-font-display": '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
    };

    for (let i = 0; i < KPI_SLOT_COUNT; i++) {
        const slotHue = (hue + i * 34) % 360;
        vars[`--dash-kpi-${i}-fg`] = `hsl(${slotHue} 72% 40%)`;
        vars[`--dash-kpi-${i}-bg`] = `hsl(${slotHue} 68% 94%)`;
        vars[`--dash-kpi-${i}-border`] = `hsl(${slotHue} 55% 82%)`;
        vars[`--dash-kpi-${i}-value`] = `hsl(${slotHue} 65% 32%)`;
    }

    return vars as CSSProperties;
}
