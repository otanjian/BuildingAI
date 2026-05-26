export function formatDashboardDateTime(value?: string | Date | null): string {
    if (value == null || value === "") {
        return "—";
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "—";
    }
    return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function fmtAxisDate(iso: string): string {
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return `${Number(parts[1])}/${Number(parts[2])}`;
}

export function formatDelta(n: number, suffix = ""): string {
    if (n > 0) return `↑ ${Math.abs(n)}${suffix} 较昨日`;
    if (n < 0) return `↓ ${Math.abs(n)}${suffix} 较昨日`;
    return "— 较昨日";
}

export function runStatusLabel(status: string): string {
    if (status === "completed") return "已完成";
    if (status === "running") return "运行中";
    if (status === "cancelled") return "已取消";
    return status;
}

export function runStatusClass(status: string): string {
    if (status === "completed") return "dash-status--ok";
    if (status === "running") return "dash-status--run";
    return "dash-status--muted";
}

export function tableTag(prefix: string, table: string): string {
    return `${prefix}${table}`;
}
