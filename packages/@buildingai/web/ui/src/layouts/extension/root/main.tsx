import { useDocumentHead, useHeadRenderer, useRefreshUser } from "@buildingai/hooks";
import { useWebExtensionDetailQuery } from "@buildingai/services/web";
import { consumeTokenFromUrl } from "@buildingai/stores";
import { ThemeProvider } from "@buildingai/ui/components/theme-provider";
import { Toaster } from "@buildingai/ui/components/ui/sonner";
import { TooltipProvider } from "@buildingai/ui/components/ui/tooltip";
import { AlertDialogProvider } from "@buildingai/ui/hooks/use-alert-dialog";
import { parseExtensionIdentifierFromLocation } from "@buildingai/utils/extension";
import type { ReactNode } from "react";
import { useMemo } from "react";

// Keep extension embeds working when AuthGuard is not on the route tree
consumeTokenFromUrl();

export const ExtensionMainLayout = ({ children }: { children: ReactNode }) => {
  useHeadRenderer();
  useRefreshUser();

  const identifier = useMemo(() => parseExtensionIdentifierFromLocation(), []);
  const { data: extension } = useWebExtensionDetailQuery(identifier || "", {
    enabled: !!identifier,
  });

  useDocumentHead({
    description: extension?.description,
    icon: extension?.icon,
  });

  return (
    <ThemeProvider>
      <TooltipProvider>
        <AlertDialogProvider>
          <Toaster position="top-center" />
          {children}
        </AlertDialogProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};
