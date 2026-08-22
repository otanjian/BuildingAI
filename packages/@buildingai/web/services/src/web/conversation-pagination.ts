export type ConversationPage<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

/**
 * Fetches every page of a paginated conversation list without allowing a
 * malformed server response to create an unbounded request loop.
 *
 * A later-page failure returns the pages already fetched. The first page is
 * still allowed to reject so callers can show their normal query error state.
 */
export async function fetchAllConversationPages<T>(
    fetchPage: (page: number) => Promise<ConversationPage<T>>,
    maxPages = 100,
): Promise<ConversationPage<T>> {
    const first = await fetchPage(1);
    const pageCount = Math.min(Math.max(first.totalPages || 1, 1), maxPages);
    let mergedItems = [...(first.items ?? [])];

    for (let page = 2; page <= pageCount; page += 1) {
        let next: ConversationPage<T>;
        try {
            next = await fetchPage(page);
        } catch {
            break;
        }

        for (const item of next.items ?? []) {
            const id =
                typeof (item as T & { id?: unknown }).id === "string"
                    ? (item as T & { id: string }).id
                    : undefined;
            if (id) {
                const existingIndex = mergedItems.findIndex(
                    (existing) => (existing as T & { id?: unknown }).id === id,
                );
                if (existingIndex >= 0) mergedItems[existingIndex] = item;
                else mergedItems.push(item);
            } else {
                mergedItems.push(item);
            }
        }
    }

    return {
        ...first,
        items: mergedItems,
    };
}
