import {
  type PersonalTodo,
  type TodoAssignee,
  type TodoListParams,
  type TodoTab,
  useCompletePersonalTodoMutation,
  useDeletePersonalTodoMutation,
  usePersonalTodosQuery,
  useReopenPersonalTodoMutation,
  useTodoAssigneesQuery,
  useUpdateTodoProgressMutation,
} from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@buildingai/ui/components/ui/empty";
import { Input } from "@buildingai/ui/components/ui/input";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@buildingai/ui/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@buildingai/ui/components/ui/tabs";
import { usePagination } from "@buildingai/ui/hooks/use-pagination";
import { Check, ClipboardList, Filter, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { TodoFilterPanel } from "./todo-filter-panel";
import { TodoFormDialog } from "./todo-form-dialog";
import { TodoRow } from "./todo-row";
import { canChangeTodoLifecycle, canEditTodo } from "./todo-policy";
import {
  clearTodoFilters,
  readTodoSearchParams,
  updateTodoSearchParams,
  validateTodoFilterRanges,
} from "./todo-view-state";

export default function PersonalTodosPage() {
  const [search, setSearch] = useSearchParams();
  const query = useMemo(() => readTodoSearchParams(search), [search]);
  const [draft, setDraft] = useState<TodoListParams>(query);
  const [showFilters, setShowFilters] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PersonalTodo | null>(null);
  const userInfo = useAuthStore((state) => state.auth.userInfo);
  const filterError = validateTodoFilterRanges(draft);
  const activeFilterCount = [
    draft.keyword,
    draft.creatorId,
    draft.assigneeId,
    draft.plannedDateFrom,
    draft.plannedDateTo,
    draft.progressMin,
    draft.progressMax,
  ].filter((value) => value !== undefined && value !== "").length;
  const todosQuery = usePersonalTodosQuery(query, { enabled: !filterError });
  const { data: assignees = [] } = useTodoAssigneesQuery();
  const progressMutation = useUpdateTodoProgressMutation();
  const completeMutation = useCompletePersonalTodoMutation();
  const reopenMutation = useReopenPersonalTodoMutation();
  const deleteMutation = useDeletePersonalTodoMutation();

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!filterError && draft.keyword !== query.keyword) {
        setSearch(updateTodoSearchParams(search, { keyword: draft.keyword }));
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft.keyword, filterError, query.keyword, search, setSearch]);

  const currentUser = useMemo<TodoAssignee | undefined>(() => {
    const fromDirectory = assignees.find((item) => item.id === userInfo?.id);
    if (fromDirectory) return fromDirectory;
    if (!userInfo) return undefined;
    return {
      id: userInfo.id,
      displayName: userInfo.realName || userInfo.nickname || userInfo.username,
      avatar: userInfo.avatar || null,
      departments: [],
    };
  }, [assignees, userInfo]);

  const { PaginationComponent } = usePagination({
    total: todosQuery.data?.total ?? 0,
    pageSize: query.pageSize ?? 15,
    page: query.page ?? 1,
    onPageChange: (page) => setSearch(updateTodoSearchParams(search, { page }, false)),
  });

  const updateFilter = (patch: Partial<TodoListParams>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if ("keyword" in patch) return;
    if (!validateTodoFilterRanges(next)) setSearch(updateTodoSearchParams(search, patch));
  };

  const runMutation = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
    } catch {
      // The shared HTTP client renders the server's focused error message.
    }
  };

  const renderActions = (todo: PersonalTodo) => {
    const isCreator = canEditTodo(todo, userInfo?.id);
    const canProgress = canChangeTodoLifecycle(todo, userInfo?.id);
    return (
      <>
        {canProgress && todo.status === "in_progress" ? (
          <Input
            aria-label={`更新 ${todo.title} 的进度`}
            type="number"
            min={0}
            max={100}
            defaultValue={todo.progress}
            className="h-8 w-20"
            onBlur={(event) => {
              const progress = Number(event.target.value);
              if (Number.isInteger(progress) && progress >= 0 && progress <= 100 && progress !== todo.progress) {
                void runMutation(
                  () => progressMutation.mutateAsync({ id: todo.id, progress, expectedUpdatedAt: todo.updatedAt }),
                  "进度已更新",
                );
              }
            }}
          />
        ) : null}
        {canProgress ? (
          todo.status === "completed" ? (
            <Button size="sm" variant="outline" onClick={() => void runMutation(() => reopenMutation.mutateAsync({ id: todo.id, expectedUpdatedAt: todo.updatedAt }), "待办已重新打开")}>
              <RotateCcw className="size-4" /> 重开
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => void runMutation(() => completeMutation.mutateAsync({ id: todo.id, expectedUpdatedAt: todo.updatedAt }), "待办已完成")}>
              <Check className="size-4" /> 完成
            </Button>
          )
        ) : null}
        {isCreator ? (
          <>
            <Button size="icon-sm" variant="ghost" aria-label={`编辑 ${todo.title}`} onClick={() => { setEditingTodo(todo); setFormOpen(true); }}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={`删除 ${todo.title}`} onClick={() => {
              if (window.confirm(`确定删除“${todo.title}”吗？`)) {
                void runMutation(() => deleteMutation.mutateAsync({ id: todo.id, expectedUpdatedAt: todo.updatedAt }), "待办已删除");
              }
            }}>
              <Trash2 className="text-destructive size-4" />
            </Button>
          </>
        ) : null}
      </>
    );
  };

  return (
    <div className="relative min-h-full overflow-auto bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_28rem)]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-12 md:p-8">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-primary mb-2 text-xs font-semibold tracking-[0.2em] uppercase">Personal workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight">我的待办</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">只展示你创建的，或当前由你负责的事项。</p>
          </div>
          <Button onClick={() => { setEditingTodo(null); setFormOpen(true); }}>
            <Plus className="size-4" /> 新建待办
          </Button>
        </header>

        <section className="rounded-2xl border bg-card/90 p-3 shadow-sm backdrop-blur md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={query.tab} onValueChange={(tab) => setSearch(updateTodoSearchParams(search, { tab: tab as TodoTab }))}>
              <TabsList>
                <TabsTrigger value="in_progress">进行中</TabsTrigger>
                <TabsTrigger value="completed">已经完成</TabsTrigger>
                <TabsTrigger value="all">全部</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters((open) => !open)} className="hidden md:inline-flex">
              <Filter className="size-4" /> 筛选{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant={activeFilterCount ? "secondary" : "outline"} size="sm" className="md:hidden">
                  <Filter className="size-4" /> 筛选{activeFilterCount ? ` (${activeFilterCount})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>筛选待办</SheetTitle>
                  <SheetDescription>条件会与当前标签组合，并自动重置到第一页。</SheetDescription>
                </SheetHeader>
                <div className="p-4">
                  <TodoFilterPanel value={draft} assignees={assignees} error={filterError} onChange={updateFilter} onClear={() => setSearch(clearTodoFilters(search))} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          {showFilters ? (
            <div className="border-border mt-4 hidden border-t pt-4 md:block">
              <TodoFilterPanel
                value={draft}
                assignees={assignees}
                error={filterError}
                onChange={updateFilter}
                onClear={() => setSearch(clearTodoFilters(search))}
              />
            </div>
          ) : null}
        </section>

        <section aria-live="polite" className="grid gap-3">
          {todosQuery.isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-2xl" />) : null}
          {todosQuery.isError ? (
            <Empty className="min-h-72 border">
              <EmptyHeader><EmptyTitle>加载待办失败</EmptyTitle><EmptyDescription>请检查网络后重试。</EmptyDescription></EmptyHeader>
              <Button variant="outline" onClick={() => todosQuery.refetch()}>重新加载</Button>
            </Empty>
          ) : null}
          {!todosQuery.isLoading && !todosQuery.isError && !todosQuery.data?.items.length ? (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
                <EmptyTitle>这里还没有待办</EmptyTitle>
                <EmptyDescription>新建一项工作，或调整标签与筛选条件。</EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => { setEditingTodo(null); setFormOpen(true); }}><Plus className="size-4" /> 新建待办</Button>
            </Empty>
          ) : null}
          {todosQuery.data?.items.map((todo) => <TodoRow key={todo.id} todo={todo} actions={renderActions(todo)} />)}
        </section>

        {todosQuery.data && todosQuery.data.total > 0 ? (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <span className="text-muted-foreground text-sm">共 {todosQuery.data.total} 项</span>
            <PaginationComponent className="mx-0 w-fit" />
          </div>
        ) : null}
      </main>

      <TodoFormDialog open={formOpen} onOpenChange={setFormOpen} todo={editingTodo} currentUser={currentUser} />
    </div>
  );
}
