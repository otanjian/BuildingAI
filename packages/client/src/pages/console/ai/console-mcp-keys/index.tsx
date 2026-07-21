import { useDocumentHead } from "@buildingai/hooks";
import {
  type ConsoleMcpApiKeyCreateResult,
  useConsoleMcpApiKeysQuery,
  useCreateConsoleMcpApiKeyMutation,
  useRevokeConsoleMcpApiKeyMutation,
} from "@buildingai/services/console";
import { Button } from "@buildingai/ui/components/ui/button";
import { Input } from "@buildingai/ui/components/ui/input";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

const AiConsoleMcpKeysPage = () => {
  const [label, setLabel] = useState("Cursor");
  const [createdSecret, setCreatedSecret] = useState<ConsoleMcpApiKeyCreateResult | null>(null);
  const { confirm } = useAlertDialog();
  const { data: keys = [], refetch, isLoading } = useConsoleMcpApiKeysQuery();

  useDocumentHead({ title: "Console MCP Keys" });

  const createMutation = useCreateConsoleMcpApiKeyMutation({
    onSuccess: (data) => {
      setCreatedSecret(data);
      toast.success("API key created — copy it now; it will not be shown again");
      refetch();
    },
  });

  const revokeMutation = useRevokeConsoleMcpApiKeyMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      refetch();
    },
  });

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  const handleRevoke = async (id: string) => {
    const ok = await confirm({
      title: "Revoke this Console MCP API key?",
      description: "Clients using this key will immediately lose access.",
    });
    if (ok) {
      revokeMutation.mutate(id);
    }
  };

  return (
    <PageContainer className="console-mcp-keys-page space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Console MCP API Keys</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          User-bound keys for the <code>buildingai-console-mcp</code> control-plane MCP. Tools
          inherit your console permissions.
        </p>
      </div>

      <div className="border-border bg-background space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-sm font-medium">Label</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Cursor desktop"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate({ label })}
            disabled={!label.trim() || createMutation.isPending}
          >
            <KeyRound className="size-4" />
            Create key
          </Button>
        </div>

        {createdSecret && (
          <div className="border-border bg-muted/40 space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Copy this secret now (shown once)</p>
            <div className="flex items-center gap-2">
              <code className="bg-background flex-1 overflow-x-auto rounded px-2 py-1 text-xs">
                {createdSecret.secret}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(createdSecret.secret)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Cursor MCP URL:{" "}
              <code>{`${window.location.origin}/mcp/buildingai-console-mcp`}</code>
              <br />
              Header: <code>Authorization: Bearer &lt;secret&gt;</code>
            </p>
          </div>
        )}
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Prefix</th>
              <th className="px-3 py-2 font-medium">Last used</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="text-muted-foreground px-3 py-4" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && keys.length === 0 && (
              <tr>
                <td className="text-muted-foreground px-3 py-4" colSpan={5}>
                  No keys yet.
                </td>
              </tr>
            )}
            {keys.map((key) => (
              <tr key={key.id} className="border-border border-t">
                <td className="px-3 py-2">{key.label}</td>
                <td className="px-3 py-2 font-mono text-xs">{key.keyPrefix}…</td>
                <td className="px-3 py-2 text-xs">
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{key.revokedAt ? "Revoked" : "Active"}</td>
                <td className="px-3 py-2 text-right">
                  {!key.revokedAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(key.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
};

export default AiConsoleMcpKeysPage;
