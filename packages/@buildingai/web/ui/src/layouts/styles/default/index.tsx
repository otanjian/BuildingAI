import { SidebarInset, SidebarProvider } from "@buildingai/ui/components/ui/sidebar";
import { Outlet, useSearchParams } from "react-router-dom";

import { DefaultAppSidebar } from "./_components/default-sidebar";
import { EmbedHistoryPanel } from "./_components/embed-history-panel";

export default function DefaultLayout({ children }: { children?: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const embedMode = searchParams.get("_embed") === "1";
  const historyMode = searchParams.get("_history") === "1";

  if (embedMode && historyMode) {
    return (
      <SidebarProvider storageKey="layout-style-default-sidebar" className="h-dvh">
        <div className="bg-background h-dvh overflow-hidden">
          <EmbedHistoryPanel />
        </div>
      </SidebarProvider>
    );
  }

  if (embedMode) {
    return (
      <SidebarProvider storageKey="layout-style-default-sidebar" className="h-dvh">
        {/* Force chat reading-column to fill iframe when platform embeds with _embed=1 */}
        <style>{`
          [data-buildingai-embed="1"] .max-w-3xl {
            max-width: 100% !important;
            width: 100% !important;
          }
        `}</style>
        <div data-buildingai-embed="1" className="bg-background h-dvh w-full overflow-hidden">
          {children || <Outlet />}
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider storageKey="layout-style-default-sidebar">
      <DefaultAppSidebar />
      <SidebarInset className="h-dvh overflow-x-hidden">{children || <Outlet />}</SidebarInset>
    </SidebarProvider>
  );
}
