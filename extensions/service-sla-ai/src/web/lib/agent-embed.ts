/** Aligns with platform agent publish → WebAPP → desktop floating embed. */

export type FloatingEmbedLayout = "desktop" | "mobile";

const FLOAT_LAYOUT: Record<
    FloatingEmbedLayout,
    { width: string; maxWidth: string; height: string; right: string; bottom: string }
> = {
    desktop: {
        width: "420px",
        maxWidth: "calc(100vw - 32px)",
        height: "720px",
        right: "24px",
        bottom: "88px",
    },
    mobile: {
        width: "88vw",
        maxWidth: "360px",
        height: "72vh",
        right: "16px",
        bottom: "80px",
    },
};

export function buildAgentPublicUrl(agentId: string, accessToken: string): string {
    const origin = window.location.origin;
    return `${origin}/agents/${agentId}/${encodeURIComponent(accessToken)}`;
}

/** Inline iframe snippet (WebAPP → 页面内嵌). */
export function buildInlineEmbedCode(publicUrl: string): string {
    return [
        `<iframe`,
        `  src="${publicUrl}"`,
        `  width="100%"`,
        `  height="720"`,
        `  style="border:0;border-radius:16px;overflow:hidden;background:#fff;"`,
        `  allow="clipboard-write; microphone; camera"`,
        `></iframe>`,
    ].join("\n");
}

/** Desktop/mobile floating iframe script (WebAPP → JS 嵌入 → 桌面悬浮). */
export function buildFloatingEmbedScript(
    publicUrl: string,
    mode: FloatingEmbedLayout = "desktop",
): string {
    const config = FLOAT_LAYOUT[mode];
    return [
        `<script>`,
        `  (() => {`,
        `    const iframe = document.createElement("iframe");`,
        `    iframe.src = "${publicUrl}";`,
        `    iframe.allow = "clipboard-write; microphone; camera";`,
        `    iframe.style.position = "fixed";`,
        `    iframe.style.right = "${config.right}";`,
        `    iframe.style.bottom = "${config.bottom}";`,
        `    iframe.style.width = "${config.width}";`,
        `    iframe.style.maxWidth = "${config.maxWidth}";`,
        `    iframe.style.height = "${config.height}";`,
        `    iframe.style.border = "0";`,
        `    iframe.style.borderRadius = "20px";`,
        `    iframe.style.background = "#fff";`,
        `    iframe.style.boxShadow = "0 20px 50px rgba(15, 23, 42, 0.16)";`,
        `    iframe.style.zIndex = "2147483000";`,
        `    document.body.appendChild(iframe);`,
        `  })();`,
        `</script>`,
    ].join("\n");
}

export function getFloatingIframeStyle(
    mode: FloatingEmbedLayout = "desktop",
): Record<string, string | number> {
    const config = FLOAT_LAYOUT[mode];
    return {
        position: "fixed",
        right: config.right,
        bottom: config.bottom,
        width: config.width,
        maxWidth: config.maxWidth,
        height: config.height,
        border: 0,
        borderRadius: "20px",
        background: "#fff",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.16)",
        zIndex: 2147483000,
    };
}

/** Right dock panel width (page-embedded agent chat). */
export const AGENT_DOCK_WIDTH = "420px";
