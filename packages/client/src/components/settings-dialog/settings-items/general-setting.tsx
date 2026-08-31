import { useI18n } from "@buildingai/i18n";
import { useTenantsQuery } from "@buildingai/services/console";
import { type FontSize, useTenantContextStore, useUserConfigStore } from "@buildingai/stores";
import { THEME_COLORS, useTheme } from "@buildingai/ui/components/theme-provider";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@buildingai/ui/components/ui/dropdown-menu";
import { ScrollArea } from "@buildingai/ui/components/ui/scroll-area";
import { cn } from "@buildingai/ui/lib/utils";
import { Check, ChevronsUpDown, Laptop, Moon, Sun } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { SettingItem, SettingItemGroup } from "../setting-item";

const FONT_SIZE_KEYS: { value: FontSize; labelKey: string }[] = [
  { value: "xs", labelKey: "settings.generalSetting.appearance.fontSize.xs" },
  { value: "sm", labelKey: "settings.generalSetting.appearance.fontSize.sm" },
  { value: "md", labelKey: "settings.generalSetting.appearance.fontSize.md" },
  { value: "lg", labelKey: "settings.generalSetting.appearance.fontSize.lg" },
  { value: "xl", labelKey: "settings.generalSetting.appearance.fontSize.xl" },
];

const THEME_MODE_KEYS = [
  { value: "light", labelKey: "settings.generalSetting.appearance.themeMode.light", icon: Sun },
  { value: "dark", labelKey: "settings.generalSetting.appearance.themeMode.dark", icon: Moon },
  {
    value: "system",
    labelKey: "settings.generalSetting.appearance.themeMode.system",
    icon: Laptop,
  },
] as const;

const LOCALE_LABELS: Record<string, string> = {
  "en-US": "English",
  "zh-CN": "简体中文",
};

const GeneralSetting = () => {
  const { t, locale, setLocale, availableLocales } = useI18n();
  const { setFontSize } = useUserConfigStore((s) => s.userConfigActions);
  const fontSize =
    useUserConfigStore((s) => s.userConfig.configs?.appearance?.fontSize as FontSize) ?? "md";

  const { theme, setTheme, themeColor, setThemeColor } = useTheme();
  const queryClient = useQueryClient();
  const tenantsQuery = useTenantsQuery();
  const tenants = tenantsQuery.data ?? [];
  const defaultTenantId = useTenantContextStore((s) => s.tenantContext.defaultTenantId);
  const activeTenantId = useTenantContextStore((s) => s.tenantContext.activeTenantId);
  const { setDefaultTenantId, setActiveTenantId } = useTenantContextStore(
    (s) => s.tenantContextActions,
  );

  const handleFontSizeChange = useCallback(
    (size: FontSize) => {
      setFontSize(size);
    },
    [setFontSize],
  );

  const fontSizeLabel = useMemo(
    () =>
      t(
        FONT_SIZE_KEYS.find((opt) => opt.value === fontSize)?.labelKey ??
          "settings.generalSetting.appearance.fontSize.md",
      ),
    [t, fontSize],
  );
  const themeModeLabel = useMemo(
    () =>
      t(
        THEME_MODE_KEYS.find((opt) => opt.value === theme)?.labelKey ??
          "settings.generalSetting.appearance.themeMode.system",
      ),
    [t, theme],
  );
  const themeColorLabel = THEME_COLORS.find((c) => c.value === themeColor)?.label ?? "默认";
  const currentLocaleLabel = LOCALE_LABELS[locale] ?? locale;

  return (
    <div className="flex flex-col gap-4">
      <SettingItemGroup label={t("settings.generalSetting.appearance.label")}>
        <SettingItem
          title={t("settings.generalSetting.appearance.themeColor.title")}
          description={t("settings.generalSetting.appearance.themeColor.description")}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`theme-${themeColor}`}>
                <div className="bg-primary size-3 rounded-full" />
                {themeColorLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>
                {t("settings.generalSetting.appearance.themeColor.selectColor")} (
                {THEME_COLORS.length})
              </DropdownMenuLabel>
              <ScrollArea className="h-72">
                {THEME_COLORS.map((color) => (
                  <DropdownMenuItem
                    key={color.value}
                    onClick={() => setThemeColor(color.value)}
                    className={cn(
                      "flex items-center gap-2",
                      color.value === themeColor && "font-medium",
                      `theme-${color.value}`,
                    )}
                  >
                    <div
                      className={cn(
                        "bg-primary flex size-3 items-center justify-center rounded-full",
                        themeColor === color.value && "ring-primary/15 ring-2",
                      )}
                    >
                      {themeColor === color.value && (
                        <Check className="text-primary-foreground size-2" />
                      )}
                    </div>
                    <span>{color.label}</span>
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>

        <SettingItem
          title={t("settings.generalSetting.appearance.themeMode.title")}
          description={t("settings.generalSetting.appearance.themeMode.description")}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {themeModeLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {THEME_MODE_KEYS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className="flex items-center gap-2"
                >
                  <option.icon className="size-4" />
                  {t(option.labelKey)}
                  {theme === option.value && (
                    <DropdownMenuShortcut>
                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>

        <SettingItem
          title={t("settings.generalSetting.appearance.fontSize.title")}
          description={t("settings.generalSetting.appearance.fontSize.description")}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {fontSizeLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {FONT_SIZE_KEYS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFontSizeChange(option.value)}
                  className="flex items-center gap-2"
                >
                  {t(option.labelKey)}
                  {fontSize === option.value && (
                    <DropdownMenuShortcut>
                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>
      </SettingItemGroup>

      <SettingItemGroup label={t("settings.generalSetting.locale.label")}>
        <SettingItem
          title={t("settings.generalSetting.locale.title")}
          description={t("settings.generalSetting.locale.description")}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {currentLocaleLabel}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableLocales.map((loc) => (
                <DropdownMenuItem
                  key={loc}
                  onClick={() => setLocale(loc)}
                  className="flex items-center gap-2"
                >
                  {LOCALE_LABELS[loc] ?? loc}
                  {locale === loc && (
                    <DropdownMenuShortcut>
                      <div className="bg-primary ring-primary/15 size-1.5 rounded-full ring-2" />
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>
      </SettingItemGroup>

      <SettingItemGroup label="租户">
        <SettingItem title="默认租户" description="登录后优先打开的租户；只能选择你已加入的租户。">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={tenantsQuery.isLoading}>
                {tenants.find((tenant) => tenant.id === defaultTenantId)?.name ?? "自动选择"}
                <ChevronsUpDown className="text-muted-foreground ml-1 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => setDefaultTenantId(undefined)}
                className="flex items-center gap-2"
              >
                自动选择
                {!defaultTenantId && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              {tenants
                .filter((tenant) => tenant.status === "active")
                .map((tenant) => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => {
                      setDefaultTenantId(tenant.id);
                      if (!activeTenantId) setActiveTenantId(tenant.id);
                      void queryClient.invalidateQueries({ queryKey: ["tenant-admin"] });
                    }}
                    className="flex items-center gap-2"
                  >
                    {tenant.name}
                    {defaultTenantId === tenant.id && <Check className="ml-auto size-4" />}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SettingItem>
      </SettingItemGroup>
    </div>
  );
};

export { GeneralSetting };
