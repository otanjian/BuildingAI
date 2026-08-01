"use client";

import {
  type UnifiedConversationItem,
  useUnifiedConversationsQuery,
} from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Input } from "@buildingai/ui/components/ui/input";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { cn } from "@buildingai/ui/lib/utils";
import { Bot, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  formatRelativeTime,
  groupConversationsByTime,
  TIME_GROUP_LABELS,
  type TimeGroup,
} from "../utils/conversation-group";

type EmbedConversationItem = {
  id: string;
  title: string;
  type: "direct" | "agent";
  agentId?: string;
  agentName?: string;
  createdAt: string;
};


/**
 * Full-page conversation history for platform iframe embeds (`?_embed=1&_history=1`).
 * BuildingAI default sidebar is hidden in embed mode, so history needs its own surface.
 */
export function EmbedHistoryPanel() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [allConversations, setAllConversations] = useState<EmbedConversationItem[]>([]);
  const pageSize = 20;

  const { data, isLoading } = useUnifiedConversationsQuery({
    page,
    pageSize,
    keyword: keyword || undefined,
  });

  const hasMore = useMemo(() => {
    if (data === undefined) return true;
    if (!data?.total) return false;
    return allConversations.length < data.total;
  }, [data, allConversations.length]);

  useEffect(() => {
    if (data?.items) {
      if (page === 1) {
        setAllConversations(data.items);
      } else {
        setAllConversations((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newItems = data.items.filter((item) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data?.items, page]);

  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    setPage((prev) => prev + 1);
  }, [hasMore, isLoading]);

  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
    setPage(1);
    setAllConversations([]);
  }, []);

  const grouped = useMemo(() => groupConversationsByTime(allConversations), [allConversations]);
  const order: TimeGroup[] = ["today", "yesterday", "3days", "7days", "30days", "older"];

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-foreground text-lg font-semibold">历史记录</h1>
        <p className="text-muted-foreground mt-1 text-sm">选择一条对话继续</p>
      </div>
      <Input
        placeholder="搜索对话..."
        value={keyword}
        onChange={(e) => handleSearch(e.target.value)}
        className="max-w-md"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <InfiniteScroll loading={isLoading} hasMore={hasMore} onLoadMore={handleLoadMore} threshold={50}>
          {isLoading && allConversations.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : allConversations.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">暂无对话记录</p>
          ) : (
            <div className="space-y-6">
              {order.map((group) => {
                const items = grouped.get(group) || [];
                if (items.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="text-muted-foreground mb-2 text-xs font-medium">
                      {TIME_GROUP_LABELS[group]}
                    </div>
                    <ul className="space-y-1">
                      {items.map((conversation) => (
                        <li key={conversation.id}>
                          <button
                            type="button"
                            className={cn(
                              "hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                            )}
                            onClick={() => {
                              const path = conversation.type === "agent"
                                ? `/agents/${conversation.agentId}/c/${conversation.id}?_embed=1`
                                : `/c/${conversation.id}?_embed=1`;
                              navigate(path);
                            }}
                          >
                            {conversation.type === "agent" ? (
                              <Bot className="text-muted-foreground size-4 shrink-0" />
                            ) : (
                              <MessageSquare className="text-muted-foreground size-4 shrink-0" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm">
                              {conversation.agentName ? (
                                <span className="text-muted-foreground mr-1 text-xs font-normal">
                                  {conversation.agentName}
                                </span>
                              ) : null}
                              {conversation.title || "新对话"}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {formatRelativeTime(conversation.createdAt)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </InfiniteScroll>
      </div>
    </div>
  );
}
