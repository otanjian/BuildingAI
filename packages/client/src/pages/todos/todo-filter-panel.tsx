import type { TodoAssignee, TodoListParams } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@buildingai/ui/components/ui/select";
import { Search, X } from "lucide-react";

interface TodoFilterPanelProps {
  value: TodoListParams;
  assignees: TodoAssignee[];
  error: string | null;
  onChange: (patch: Partial<TodoListParams>) => void;
  onClear: () => void;
}

export function TodoFilterPanel({ value, assignees, error, onChange, onClear }: TodoFilterPanelProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={value.keyword ?? ""}
            onChange={(event) => onChange({ keyword: event.target.value })}
            className="pl-9"
            placeholder="搜索标题或描述"
            aria-label="搜索待办"
          />
        </div>
        <Select value={value.creatorId ?? "any"} onValueChange={(next) => onChange({ creatorId: next === "any" ? undefined : next })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="全部创建者" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">全部创建者</SelectItem>
            {assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={value.assigneeId ?? "any"} onValueChange={(next) => onChange({ assigneeId: next === "any" ? undefined : next })}>
          <SelectTrigger className="w-full"><SelectValue placeholder="全部责任人" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">全部责任人</SelectItem>
            {assignees.map((item) => <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="ghost" onClick={onClear} className="justify-self-start">
          <X className="size-4" /> 清除筛选
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="planned-from" className="text-muted-foreground text-xs">计划日期从</Label>
          <Input id="planned-from" type="date" value={value.plannedDateFrom ?? ""} onChange={(event) => onChange({ plannedDateFrom: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="planned-to" className="text-muted-foreground text-xs">计划日期至</Label>
          <Input id="planned-to" type="date" value={value.plannedDateTo ?? ""} onChange={(event) => onChange({ plannedDateTo: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="progress-min" className="text-muted-foreground text-xs">最低进度</Label>
          <Input id="progress-min" type="number" min={0} max={100} value={value.progressMin ?? ""} onChange={(event) => onChange({ progressMin: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="0" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="progress-max" className="text-muted-foreground text-xs">最高进度</Label>
          <Input id="progress-max" type="number" min={0} max={100} value={value.progressMax ?? ""} onChange={(event) => onChange({ progressMax: event.target.value === "" ? undefined : Number(event.target.value) })} placeholder="100" />
        </div>
      </div>
      {error ? <p role="alert" className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
