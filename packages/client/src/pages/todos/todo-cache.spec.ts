import { describe, expect, it, vi } from "vitest";

import { invalidateTodoCaches } from "../../../../@buildingai/web/services/src/web/todo-cache";

describe("todo mutation cache refresh", () => {
  it("refreshes affected lists, details, and sidebar count", async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    };
    await invalidateTodoCaches(queryClient as never, "todo-1");
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["todos", "list"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["todos", "assigned-in-progress-count"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["todos", "detail", "todo-1"],
    });
  });
});
