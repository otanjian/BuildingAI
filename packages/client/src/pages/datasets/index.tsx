import { definePageMeta, useDocumentHead } from "@buildingai/hooks";
import {
  useDatasetTags,
  useMyCreatedDatasetsInfiniteQuery,
  useSquareDatasetsInfiniteQuery,
  useTeamDatasetsInfiniteQuery,
} from "@buildingai/services/web";
import { InfiniteScroll } from "@buildingai/ui/components/infinite-scroll";
import { Avatar, AvatarFallback, AvatarImage } from "@buildingai/ui/components/ui/avatar";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@buildingai/ui/components/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@buildingai/ui/components/ui/item";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import { cn } from "@buildingai/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  FileCheck2,
  FileText,
  Filter,
  Loader2,
  ScanSearch,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDebounceValue } from "usehooks-ts";

const PAGE_SIZE = 20;
const SCOPE_PAGE_SIZE = 20;

/** Read-only governance signals for enterprise knowledge-base operations. */
function DatasetGovernanceOverview() {
  const signals = [
    {
      title: "租户成员范围",
      description: "按租户与团队成员授权",
      value: "已启用",
      detail: "仅展示当前租户可见知识库",
      icon: Users,
      tone: "text-sky-600",
    },
    {
      title: "上传扫描与隔离",
      description: "文件进入索引前完成安全检查",
      value: "策略生效",
      detail: "恶意或违规文件将被隔离",
      icon: ScanSearch,
      tone: "text-emerald-600",
    },
    {
      title: "摄取与索引进度",
      description: "异步任务可追踪、可恢复",
      value: "实时跟踪",
      detail: "失败任务不会自动暴露旧索引",
      icon: DatabaseZap,
      tone: "text-violet-600",
    },
    {
      title: "引用与撤销过滤",
      description: "回答仅使用当前有效文档",
      value: "已开启",
      detail: "撤销或过期内容自动过滤",
      icon: Filter,
      tone: "text-amber-600",
    },
    {
      title: "失败索引安全状态",
      description: "异常索引保持隔离并可审计",
      value: "安全",
      detail: "需人工复核后才允许重新发布",
      icon: FileCheck2,
      tone: "text-rose-600",
    },
  ] as const;

  return (
    <Card className="mb-6 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" />
          知识库安全与索引治理
        </CardTitle>
        <CardDescription>
          只读状态概览，具体策略由企业管理员统一配置
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.title}
                className="bg-muted/30 rounded-lg border p-3"
                data-testid={`dataset-governance-${signal.title}`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">{signal.title}</span>
                  <Icon className={cn("size-4", signal.tone)} />
                </div>
                <div className="text-sm font-medium">{signal.value}</div>
                <div className="text-muted-foreground mt-1 text-xs leading-5">{signal.detail}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function datasetDetailTo(id: string, searchParams: URLSearchParams) {
  const embed = searchParams.get("_embed");
  return embed === "1" ? `/datasets/${id}?_embed=1` : `/datasets/${id}`;
}

function ScopedDatasetsList({ scope }: { scope: "mine" | "team" }) {
  const [searchParams] = useSearchParams();
  const title = scope === "mine" ? "我的知识库" : "团队知识库";
  const subtitle = scope === "mine" ? "管理你创建的知识库" : "你加入的团队知识库";
  useDocumentHead({ title });

  const mineQuery = useMyCreatedDatasetsInfiniteQuery(SCOPE_PAGE_SIZE);
  const teamQuery = useTeamDatasetsInfiniteQuery(SCOPE_PAGE_SIZE);
  const query = scope === "mine" ? mineQuery : teamQuery;

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data?.pages]);

  return (
    <ScrollArea className="h-dvh" viewportClassName="[&_>div]:block!">
      <div className="flex w-full flex-col items-center">
        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="mb-6 flex flex-col gap-2 sm:px-3">
            <h1 className="text-2xl">{title}</h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
          <div className="sm:px-3">
            <DatasetGovernanceOverview />
          </div>
          <div className="sm:px-3">
            {query.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">暂无知识库</p>
            ) : (
              <InfiniteScroll
                loading={query.isFetchingNextPage}
                hasMore={query.hasNextPage ?? false}
                onLoadMore={() => query.fetchNextPage()}
                emptyText=""
                showEmptyText={!(query.hasNextPage ?? false)}
              >
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {items.map((dataset) => {
                    const displayName = dataset.name ?? "知识库";
                    const initial = displayName.slice(0, 1).toUpperCase();
                    return (
                      <Item
                        key={dataset.id}
                        asChild
                        className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding]! hover:px-4"
                      >
                        <Link to={datasetDetailTo(dataset.id, searchParams)}>
                          <ItemMedia>
                            <Avatar className="size-10 rounded-lg after:rounded-lg">
                              <AvatarImage
                                className="rounded-lg"
                                src={dataset.coverUrl ?? undefined}
                              />
                              <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{dataset.name}</ItemTitle>
                            <ItemDescription className="line-clamp-1">
                              {dataset.description?.trim() || "暂无描述"}
                            </ItemDescription>
                            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <FileText className="size-3.5 shrink-0 opacity-70" />
                                {dataset.documentCount ?? 0}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="size-3.5 shrink-0 opacity-70" />
                                {dataset.memberCount ?? 0}
                              </span>
                            </div>
                          </ItemContent>
                          <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="rounded-full"
                              aria-label="进入"
                            >
                              <ChevronRight />
                            </Button>
                          </ItemActions>
                        </Link>
                      </Item>
                    );
                  })}
                </div>
              </InfiniteScroll>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export const meta = definePageMeta({
  title: "知识库广场",
  description: "选择你想要的知识库",
  icon: "book-search",
});

const KnowledgeIndexPage = () => {
  const [searchParams] = useSearchParams();
  const scope = searchParams.get("scope");
  if (scope === "mine" || scope === "team") {
    return <ScopedDatasetsList scope={scope} />;
  }
  return <KnowledgePlazaPage />;
};

const KnowledgePlazaPage = () => {
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword] = useDebounceValue(keyword.trim(), 300);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const tagScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollTagsLeft, setCanScrollTagsLeft] = useState(false);
  const [canScrollTagsRight, setCanScrollTagsRight] = useState(false);

  useDocumentHead({
    title: "知识库广场",
  });

  const { data: tagsData } = useDatasetTags();
  const tags = tagsData ?? [];

  const squareQuery = useSquareDatasetsInfiniteQuery(
    {
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword || undefined,
      tagIds: selectedTagId ? [selectedTagId] : undefined,
    },
    { enabled: true },
  );

  const items = useMemo(
    () => squareQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [squareQuery.data?.pages],
  );
  const hasNextPage = squareQuery.hasNextPage ?? false;
  const isFetchingNextPage = squareQuery.isFetchingNextPage;

  const selectTag = (tagId: string) => {
    setSelectedTagId((prev) => (prev === tagId ? null : tagId));
  };

  const updateTagScrollState = useCallback(() => {
    const container = tagScrollRef.current;
    if (!container) {
      setCanScrollTagsLeft(false);
      setCanScrollTagsRight(false);
      return;
    }

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollTagsLeft(container.scrollLeft > 4);
    setCanScrollTagsRight(maxScrollLeft - container.scrollLeft > 4);
  }, []);

  const scrollTagsBy = useCallback((direction: "left" | "right") => {
    const container = tagScrollRef.current;
    if (!container) return;

    const offset = Math.max(container.clientWidth * 0.75, 160);
    container.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const container = tagScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateTagScrollState();
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(container);
    if (container.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(container.firstElementChild);
    }

    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateTagScrollState, tags.length]);

  useEffect(() => {
    updateTagScrollState();
  }, [tags, updateTagScrollState]);

  const isTagSelected = (tagId: string) => selectedTagId === tagId;
  const badgeClass = (selected: boolean) =>
    cn(
      "h-9 cursor-pointer px-4 font-medium text-nowrap sm:font-normal",
      selected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
    );

  return (
    <ScrollArea className="h-dvh" viewportClassName="[&_>div]:block!">
      <div className="flex w-full flex-col items-center">
        <div className="w-full max-w-4xl px-4 py-8 pt-12 sm:pt-20 md:px-6">
          <div className="bg-background sticky top-0 z-20 py-4">
            <div className="flex flex-col items-center justify-between gap-4 max-sm:items-start sm:flex-row sm:px-3">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl">知识库广场</h1>
                <p className="text-muted-foreground text-sm">加入你喜爱的知识库进行交互</p>
              </div>
              <div className="max-sm:w-full">
                <InputGroup className="rounded-full">
                  <InputGroupInput
                    placeholder="搜索知识库"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            <div className="group relative mt-8 sm:px-3">
              <div
                className={cn(
                  "from-background via-background/80 pointer-events-none absolute inset-y-0 left-0 z-10 flex w-24 items-center bg-linear-to-r to-transparent transition-opacity duration-300",
                  canScrollTagsLeft ? "opacity-100" : "opacity-0",
                )}
              >
                <Button
                  type="button"
                  size="icon-xs"
                  className="border-border bg-background text-muted-foreground hover:bg-background hover:text-primary pointer-events-auto ml-2 flex size-8 items-center justify-center rounded-full border shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => scrollTagsBy("left")}
                >
                  <ChevronLeft className="size-3.5 stroke-3" />
                </Button>
              </div>

              <div
                className={cn(
                  "from-background via-background/80 pointer-events-none absolute inset-y-0 right-0 z-10 flex w-24 items-center justify-end bg-linear-to-l to-transparent transition-opacity duration-300",
                  canScrollTagsRight ? "opacity-100" : "opacity-0",
                )}
              >
                <Button
                  type="button"
                  size="icon-xs"
                  className="border-border bg-background text-muted-foreground hover:bg-background hover:text-primary pointer-events-auto mr-2 flex size-8 items-center justify-center rounded-full border shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.05)] transition-all duration-200 hover:scale-110 active:scale-95"
                  onClick={() => scrollTagsBy("right")}
                >
                  <ChevronRight className="size-3.5 stroke-3" />
                </Button>
              </div>

              <div ref={tagScrollRef} className="no-scrollbar overflow-x-auto scroll-smooth py-2">
                <div className="flex min-w-max flex-nowrap gap-2">
                  <Badge
                    className={badgeClass(selectedTagId === null)}
                    onClick={() => setSelectedTagId(null)}
                  >
                    全部
                  </Badge>
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      className={badgeClass(isTagSelected(tag.id))}
                      onClick={() => selectTag(tag.id)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:px-3">
            <DatasetGovernanceOverview />
            {squareQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground size-8 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center text-sm">暂无知识库</p>
            ) : (
              <InfiniteScroll
                loading={isFetchingNextPage}
                hasMore={hasNextPage}
                onLoadMore={() => squareQuery.fetchNextPage()}
                emptyText=""
                showEmptyText={!hasNextPage}
              >
                <div className="grid gap-x-4 sm:grid-cols-2">
                  {items.map((dataset) => {
                    const creator = (
                      dataset as {
                        creator?: {
                          id: string;
                          nickname: string | null;
                          avatar: string | null;
                        } | null;
                      }
                    )?.creator;
                    const displayName = dataset.name ?? creator?.nickname ?? "未知用户";
                    const initial = displayName.slice(0, 1).toUpperCase();
                    const creatorLabel = creator?.nickname ?? "匿名";
                    const creatorInitial = creatorLabel.slice(0, 1).toUpperCase();
                    return (
                      <Item
                        key={dataset.id}
                        asChild
                        className="group/apps-item hover:bg-accent cursor-pointer px-0 transition-[padding]! hover:px-4"
                      >
                        <Link to={datasetDetailTo(dataset.id, searchParams)}>
                          <ItemMedia>
                            <Avatar className="size-10 rounded-lg after:rounded-lg">
                              <AvatarImage
                                className="rounded-lg"
                                src={dataset.coverUrl ?? creator?.avatar ?? undefined}
                              />
                              <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{dataset.name}</ItemTitle>
                            <ItemDescription className="line-clamp-1">
                              {dataset.description?.trim() || "暂无描述"}
                            </ItemDescription>
                            <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1">
                                  <FileText className="size-3.5 shrink-0 opacity-70" />
                                  {dataset.documentCount ?? 0}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Users className="size-3.5 shrink-0 opacity-70" />
                                  {dataset.memberCount ?? 0}
                                </span>
                              </div>
                              <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1.5 text-xs">
                                <Avatar className="size-4 shrink-0">
                                  <AvatarImage src={creator?.avatar ?? undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {creatorInitial || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{creatorLabel}</span>
                              </div>
                            </div>
                          </ItemContent>
                          <ItemActions className="opacity-0 group-hover/apps-item:opacity-100">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              className="rounded-full"
                              aria-label="进入"
                            >
                              <ChevronRight />
                            </Button>
                          </ItemActions>
                        </Link>
                      </Item>
                    );
                  })}
                </div>
              </InfiniteScroll>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export default KnowledgeIndexPage;
