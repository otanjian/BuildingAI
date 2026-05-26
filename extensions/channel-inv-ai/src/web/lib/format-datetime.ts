/** Format API ISO timestamps for CHI tables (local timezone). */
export function formatChannelInvDateTime(value?: string | Date | null): string {
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
