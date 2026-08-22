import { describe, expect, it, vi } from "vitest";

import { fetchAllConversationPages } from "../../../../../../@buildingai/web/services/src/web/conversation-pagination";

type Conversation = { id: string; title: string };

const page = (items: Conversation[], current: number, totalPages: number) => ({
  items,
  total: 3,
  page: current,
  pageSize: 2,
  totalPages,
});

describe("fetchAllConversationPages", () => {
  it("returns the first page without fetching unnecessary pages", async () => {
    const fetchPage = vi.fn(async () => page([{ id: "1", title: "one" }], 1, 1));

    await expect(fetchAllConversationPages(fetchPage)).resolves.toMatchObject({
      items: [{ id: "1", title: "one" }],
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("loads every page and keeps each conversation once", async () => {
    const fetchPage = vi.fn(async (current: number) =>
      current === 1
        ? page(
            [
              { id: "1", title: "old" },
              { id: "2", title: "two" },
            ],
            1,
            2,
          )
        : page(
            [
              { id: "2", title: "new" },
              { id: "3", title: "three" },
            ],
            2,
            2,
          ),
    );

    await expect(fetchAllConversationPages(fetchPage)).resolves.toMatchObject({
      items: [
        { id: "1", title: "old" },
        { id: "2", title: "new" },
        { id: "3", title: "three" },
      ],
    });
    expect(fetchPage.mock.calls.map(([current]) => current)).toEqual([1, 2]);
  });

  it("keeps loaded records when a later page fails", async () => {
    const fetchPage = vi.fn(async (current: number) => {
      if (current === 1) return page([{ id: "1", title: "one" }], 1, 3);
      throw new Error("temporary failure");
    });

    await expect(fetchAllConversationPages(fetchPage)).resolves.toMatchObject({
      items: [{ id: "1", title: "one" }],
    });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
