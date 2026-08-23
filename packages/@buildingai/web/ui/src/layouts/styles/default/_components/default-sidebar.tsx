import { BooleanNumber } from "@buildingai/constants/shared";
import type { DecorateMenuItem } from "@buildingai/services/web";
import {
  useDecorateMenuQuery,
  useTodoAssignedCountQuery,
  useUnifiedConversationsQuery,
} from "@buildingai/services/web";
import { useAuthStore } from "@buildingai/stores";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@buildingai/ui/components/ui/sidebar";
import { isEnabled } from "@buildingai/utils/is";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { useEffect, useMemo } from "react";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { DefaultNavGroup } from "./default-group";
import { DefaultLogo } from "./default-logo";
import { DefaultNavMain, type NavItem } from "./default-nav-main";
import { DefaultNavUser } from "./default-nav-user";
import { TodoSidebarBadge } from "./todo-sidebar-badge";

/**
 * Keyboard shortcut component that registers a global shortcut and displays the key hint
 */
function KeyboardShortcut({
  keys,
  onTrigger,
  className,
}: {
  keys: { meta?: boolean; ctrl?: boolean; shift?: boolean; key: string };
  onTrigger: () => void;
  className?: string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const metaMatch = keys.meta ? e.metaKey : true;
      const ctrlMatch = keys.ctrl ? e.ctrlKey : true;
      const shiftMatch = keys.shift ? e.shiftKey : true;
      const keyMatch = e.key.toLowerCase() === keys.key.toLowerCase();

      if (metaMatch && ctrlMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keys, onTrigger]);

  const label = [keys.meta && "⌘", keys.ctrl && "⌃", keys.shift && "⇧", keys.key.toUpperCase()]
    .filter(Boolean)
    .join("");

  return <span className={className}>{label}</span>;
}

const MENU_HOME_FIXED = "menu_home_fixed";
const MENU_HISTORY_FIXED = "menu_history_fixed";
const MENU_PERSONAL_TODOS = "menu_personal_todos";

/**
 * Default chat component path used to identify if home page is the chat page.
 */
const DEFAULT_CHAT_COMPONENT = "/src/pages/index.tsx";

/**
 * Convert DecorateMenuItem to NavItem format used by DefaultNavMain.
 * Handles special menu_history_fixed item by injecting conversation sub-items.
 * Filters out items whose required permissions the user does not have.
 * Root users bypass permission checks.
 */
function useMenuItems(
  menus: DecorateMenuItem[],
  conversationItems: {
    id: string;
    title: string;
    path: string;
    type?: string;
    agentId?: string;
    agentName?: string;
  }[],
  homeAction?: React.ReactNode,
  todoAction?: React.ReactNode,
  userPermissions?: string[],
  isRoot?: boolean,
): NavItem[] {
  return useMemo(() => {
    return menus
      .filter((menu) => {
        if (menu.isHidden) return false;
        if (isRoot) return true;
        // Guard "新对话" with agent.manage permission by default
        if (menu.id === MENU_HOME_FIXED) {
          return userPermissions?.includes("agent.manage") ?? false;
        }
        if (menu.permissions && menu.permissions.length > 0) {
          return menu.permissions.some((p) => userPermissions?.includes(p));
        }
        return true;
      })
      .map((menu): NavItem => {
        if (menu.id === MENU_HISTORY_FIXED) {
          return {
            id: menu.id,
            title: menu.title,
            icon: menu.icon,
            isActive: true,
            items: conversationItems,
          };
        }

        return {
          id: menu.id,
          title: menu.title,
          path: menu.link.path,
          icon: menu.icon,
          target: menu.link.target,
          ...(menu.id === MENU_HOME_FIXED && homeAction ? { action: homeAction } : {}),
          ...(menu.id === MENU_PERSONAL_TODOS && todoAction ? { action: todoAction } : {}),
        };
      });
  }, [menus, conversationItems, homeAction, todoAction, userPermissions, isRoot]);
}

export function DefaultAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const { userInfo } = useAuthStore((state) => state.auth);
  const { data: menuConfig, isLoading: isMenuLoading } = useDecorateMenuQuery();
  const hasTodoMenu = menuConfig?.menus?.some(
    (menu) => menu.id === MENU_PERSONAL_TODOS && !menu.isHidden,
  );
  const { data: todoCount, isLoading: isTodoCountLoading } = useTodoAssignedCountQuery({
    enabled: Boolean(hasTodoMenu),
  });
  const { data: conversationsData } = useUnifiedConversationsQuery(
    { page: 1, pageSize: 20 },
    { refetchOnWindowFocus: false },
  );

  const conversationItems = useMemo(
    () =>
      conversationsData?.items?.map((item) => {
        const isAgent = item.type === "agent";
        const path = isAgent ? `/agents/${item.agentId}/c/${item.id}` : `/c/${item.id}`;
        return {
          id: `${item.type}-${item.id}`,
          title: item.title || "新对话",
          path,
          type: item.type,
          agentId: item.agentId,
          agentName: item.agentName,
        };
      }) || [],
    [conversationsData],
  );

  const homeMenu = menuConfig?.menus?.find((m) => m.id === MENU_HOME_FIXED);
  const isChatHome = homeMenu?.link?.component === DEFAULT_CHAT_COMPONENT;

  const homeAction = isChatHome ? (
    <KeyboardShortcut
      keys={{ meta: true, key: "k" }}
      onTrigger={() => navigate("/")}
      className="text-muted-foreground/70 opacity-0 group-hover/link-menu-item:opacity-100"
    />
  ) : undefined;
  const todoAction = hasTodoMenu ? (
    <TodoSidebarBadge count={todoCount?.count} isLoading={isTodoCountLoading} />
  ) : undefined;

  const permissionsCodes = userInfo?.permissionsCodes ?? [];
  const isRoot = userInfo?.isRoot === BooleanNumber.YES;
  const navMain = useMenuItems(
    menuConfig?.menus ?? [],
    conversationItems,
    homeAction,
    todoAction,
    permissionsCodes,
    isRoot,
  );

  const consoleLink = useMemo(() => {
    const menus = userInfo?.menus || [];

    // Collect all type-2 menu paths in depth-first order (pure function, React Compiler-compatible)
    const collectPaths = (items: typeof menus, parentPath = ""): string[] => {
      const paths: string[] = [];
      for (const item of items) {
        const currentPath = item.path
          ? [parentPath, item.path].filter(Boolean).join("/")
          : parentPath;

        if (item.type === 2 && item.path && item.path !== "#") {
          paths.push(`/console/${currentPath}`);
        }

        if (item.children?.length) {
          paths.push(...collectPaths(item.children, currentPath));
        }
      }
      return paths;
    };

    const paths = collectPaths(menus);
    return paths.find((p) => p === "/console/dashboard") ?? paths[0] ?? "/console/dashboard";
  }, [userInfo?.menus]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-row items-center">
        <DefaultLogo />
      </SidebarHeader>
      <SidebarContent>
        <DefaultNavMain items={navMain} isLoading={isMenuLoading} />
        {(menuConfig?.groups ?? [])
          .filter((group) => !group.isHidden)
          .map((group) => (
            <DefaultNavGroup key={group.id} group={group} />
          ))}
      </SidebarContent>
      <SidebarFooter className="in-data-[state=collapsed]:overflow-hidden">
        <SidebarMenu>
          {isEnabled(userInfo?.permissions) && (
            <SidebarMenuItem>
              <SidebarMenuButton className="h-9" asChild>
                <Link to={consoleLink}>
                  <LayoutDashboard />
                  <span className="whitespace-nowrap">工作台</span>
                  <SidebarMenuAction asChild>
                    <div>
                      <ArrowUpRight />
                      <span className="sr-only">Toggle</span>
                    </div>
                  </SidebarMenuAction>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <DefaultNavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
