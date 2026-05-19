/**
 * Build a short sidebar title from the user's first message.
 */
export function buildConversationTitleFromText(
    text: string,
    maxLength = 20,
): string | null {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    return normalized.slice(0, maxLength);
}
