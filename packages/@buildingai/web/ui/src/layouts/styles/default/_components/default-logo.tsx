import { useConfigStore } from "@buildingai/stores";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@buildingai/ui/components/ui/sidebar";
import { cn } from "@buildingai/ui/lib/utils";
import { Link } from "react-router-dom";

const BOWI_AGENT_PLATFORM_NAME = "BowiAI Agent平台";
const BOWI_AGENT_PLATFORM_LOGO = "/static/avatars/bowiai-agent-platform.svg";

export function DefaultLogo() {
  const { websiteConfig } = useConfigStore((state) => state.config);
  const { state } = useSidebar();
  const platformName = websiteConfig?.webinfo.name?.trim() || BOWI_AGENT_PLATFORM_NAME;
  const platformLogo = websiteConfig?.webinfo.logo?.trim() || BOWI_AGENT_PLATFORM_LOGO;

  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex">
        <SidebarMenuButton size="lg" asChild>
          <div className="group/default-logo-button relative flex w-full items-center">
            <SidebarTrigger
              className={cn("absolute inset-0 z-2 hidden opacity-0 transition-opacity md:flex", {
                "flex md:group-hover/default-logo-button:opacity-100": state === "collapsed",
                "pointer-events-none hidden": state === "expanded",
              })}
            />
            <Link
              to="/"
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 pr-8 transition-opacity duration-200",
                {
                  "relative z-1 md:group-hover/default-logo-button:opacity-0":
                    state === "collapsed",
                },
              )}
            >
              <img
                src={platformLogo}
                alt={platformName}
                className="size-8 shrink-0 rounded-md object-cover"
              />
              {state === "expanded" ? (
                <span className="truncate text-sm leading-tight font-semibold">{platformName}</span>
              ) : null}
            </Link>
            {state === "expanded" ? (
              <SidebarTrigger className="hover:bg-accent-foreground/5 absolute top-1/2 right-0 -translate-y-1/2" />
            ) : null}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
