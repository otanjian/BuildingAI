import { useI18n } from "@buildingai/i18n";
import {
  useDeleteUserConfigMutation,
  type UserConfigRecord,
  useSetUserConfigMutation,
  useUserConfigRecordsQuery,
} from "@buildingai/services/shared";
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
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { SettingItemGroup } from "../setting-item";

const PARAM_GROUP = "personalParams";

type FormState = { mode: "create" } | { mode: "edit"; record: UserConfigRecord } | null;

const PersonalParamsSetting = () => {
  const { t } = useI18n();
  const { confirm } = useAlertDialog();
  const {
    data: records = [],
    isLoading,
    isRefetching,
    refetch,
  } = useUserConfigRecordsQuery(PARAM_GROUP);

  const [formState, setFormState] = useState<FormState>(null);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");

  const setMutation = useSetUserConfigMutation();
  const deleteMutation = useDeleteUserConfigMutation(PARAM_GROUP);

  const existingCodes = useMemo(() => new Set(records.map((r) => r.key)), [records]);

  const openCreate = useCallback(() => {
    setCode("");
    setValue("");
    setFormState({ mode: "create" });
  }, []);

  const openEdit = useCallback((record: UserConfigRecord) => {
    setCode(record.key);
    setValue(typeof record.value === "string" ? record.value : JSON.stringify(record.value ?? ""));
    setFormState({ mode: "edit", record });
  }, []);

  const closeForm = useCallback(() => {
    if (setMutation.isPending) return;
    setFormState(null);
  }, [setMutation.isPending]);

  const handleSubmit = useCallback(async () => {
    const trimmedCode = code.trim();
    const trimmedValue = value.trim();
    if (!trimmedCode) {
      toast.error("请输入参数编码");
      return;
    }
    if (formState?.mode === "create" && existingCodes.has(trimmedCode)) {
      toast.error("参数编码已存在");
      return;
    }

    if (formState?.mode === "edit" && formState.record.key !== trimmedCode) {
      if (existingCodes.has(trimmedCode)) {
        toast.error("参数编码已存在");
        return;
      }
      await deleteMutation.mutateAsync(formState.record.key, {
        onSuccess: () => toast.success("已更新个人参数"),
        onError: (error) => toast.error(`更新失败: ${(error as Error).message}`),
      });
    }

    setMutation.mutate(
      { key: trimmedCode, value: trimmedValue, group: PARAM_GROUP },
      {
        onSuccess: () => {
          toast.success(formState?.mode === "edit" ? "已更新个人参数" : "已新增个人参数");
          setFormState(null);
          void refetch();
        },
        onError: (error) => toast.error(`保存失败: ${(error as Error).message}`),
      },
    );
  }, [code, value, existingCodes, formState, deleteMutation, setMutation, refetch]);

  const handleDelete = useCallback(
    async (record: UserConfigRecord) => {
      try {
        await confirm({
          title: "删除个人参数",
          description: `确定要删除参数「${record.key}」吗？此操作不可恢复。`,
          confirmVariant: "destructive",
        });
      } catch {
        return;
      }
      deleteMutation.mutate(record.key, {
        onSuccess: () => {
          toast.success("已删除个人参数");
          void refetch();
        },
        onError: (error) => toast.error(`删除失败: ${(error as Error).message}`),
      });
    },
    [confirm, deleteMutation, refetch],
  );

  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label={t("settings.personalParams.label")}>
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span className="text-muted-foreground text-xs">{t("settings.personalParams.hint")}</span>
          <Button size="sm" onClick={openCreate} disabled={setMutation.isPending}>
            <Plus />
            {t("settings.personalParams.add")}
          </Button>
        </div>
        <div className="px-3 pb-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">{t("settings.personalParams.code")}</TableHead>
                <TableHead className="w-1/2">{t("settings.personalParams.value")}</TableHead>
                <TableHead className="w-20 text-right">
                  {t("settings.personalParams.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="flex flex-col gap-2 py-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-6 text-center">
                    {t("settings.personalParams.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs">{record.key}</TableCell>
                    <TableCell className="max-w-60 truncate text-xs">
                      {typeof record.value === "string"
                        ? record.value
                        : JSON.stringify(record.value ?? "")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => openEdit(record)}
                          disabled={setMutation.isPending || deleteMutation.isPending}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="hover:bg-destructive/10 dark:hover:bg-destructive/15"
                          onClick={() => handleDelete(record)}
                          disabled={setMutation.isPending || deleteMutation.isPending}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {isRefetching && !isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="py-1 text-center">
                    <Loader2 className="text-muted-foreground mx-auto size-4 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SettingItemGroup>

      <Dialog open={formState !== null} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formState?.mode === "edit"
                ? t("settings.personalParams.editTitle")
                : t("settings.personalParams.addTitle")}
            </DialogTitle>
            <DialogDescription>{t("settings.personalParams.formHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <label className="text-muted-foreground text-sm font-medium">
                {t("settings.personalParams.code")}
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="例如：company_name"
                disabled={setMutation.isPending}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-muted-foreground text-sm font-medium">
                {t("settings.personalParams.value")}
              </label>
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t("settings.personalParams.valuePlaceholder")}
                disabled={setMutation.isPending}
                rows={2}
                className="min-h-0 field-sizing-fixed resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={setMutation.isPending}>
              {t("settings.personalParams.cancel")}
            </Button>
            <Button onClick={() => void handleSubmit()} loading={setMutation.isPending}>
              {t("settings.personalParams.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { PersonalParamsSetting };
