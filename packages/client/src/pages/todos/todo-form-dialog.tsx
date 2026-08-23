import {
  type PersonalTodo,
  type TodoAssignee,
  invalidateTodoCaches,
  useCreatePersonalTodoMutation,
  useTodoAssigneesQuery,
  useUpdatePersonalTodoMutation,
} from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { isTodoConflict, validateTodoForm } from "./todo-policy";

interface TodoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo?: PersonalTodo | null;
  currentUser?: TodoAssignee;
}

export function TodoFormDialog({ open, onOpenChange, todo, currentUser }: TodoFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const { data: directory = [] } = useTodoAssigneesQuery({}, { enabled: open });
  const createMutation = useCreatePersonalTodoMutation();
  const updateMutation = useUpdatePersonalTodoMutation();
  const queryClient = useQueryClient();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setTitle(todo?.title ?? "");
    setDescription(todo?.description ?? "");
    setAssigneeId(todo?.assigneeId ?? currentUser?.id ?? "");
    setPlannedDate(todo?.plannedCompletionDate ?? "");
  }, [open, todo, currentUser?.id]);

  const assignees = useMemo(() => {
    const items = [...directory];
    if (currentUser && !items.some((item) => item.id === currentUser.id)) items.unshift(currentUser);
    return items;
  }, [directory, currentUser]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateTodoForm({
      title,
      assigneeId,
      plannedCompletionDate: plannedDate || null,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      if (todo) {
        await updateMutation.mutateAsync({
          id: todo.id,
          title: title.trim(),
          description: description.trim() || null,
          assigneeId,
          plannedCompletionDate: plannedDate || null,
          expectedUpdatedAt: todo.updatedAt,
        });
        toast.success("待办已更新");
      } else {
        await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || null,
          assigneeId: assigneeId || undefined,
          plannedCompletionDate: plannedDate || null,
        });
        toast.success("待办已创建");
      }
      onOpenChange(false);
    } catch (error) {
      if (isTodoConflict(error) && todo) {
        toast.error("这项待办已被他人更新，已刷新最新内容，请重新编辑");
        void invalidateTodoCaches(queryClient, todo.id);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{todo ? "编辑待办" : "新建待办"}</DialogTitle>
          <DialogDescription>创建者由系统确定，责任人默认是你自己。</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="todo-title">标题</Label>
            <Input
              id="todo-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="todo-description">描述</Label>
            <Textarea
              id="todo-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="补充背景、验收标准或相关信息"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="todo-assignee">责任人</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="todo-assignee" className="w-full">
                  <SelectValue placeholder="选择责任人" />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span>{item.displayName}</span>
                      {item.departments.length ? (
                        <span className="text-muted-foreground text-xs">
                          {item.departments.map((department) => department.name).join(" / ")}
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="todo-planned-date">计划完成日期</Label>
              <Input
                id="todo-planned-date"
                type="date"
                value={plannedDate}
                onChange={(event) => setPlannedDate(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
