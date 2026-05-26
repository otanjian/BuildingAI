import { getAgent } from "@buildingai/services/web";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { buildAgentPublicUrl, buildFloatingEmbedScript } from "../lib/agent-embed";
import { getSettings } from "../services/settings";

export function useForecastAgentEmbed() {
    const location = useLocation();
    const [agentId, setAgentId] = useState("");

    const reloadSettings = useCallback(async () => {
        const s = await getSettings();
        setAgentId(s.agentId?.trim() ?? "");
    }, []);

    useEffect(() => {
        void reloadSettings();
    }, [reloadSettings, location.pathname]);

    const agentQuery = useQuery({
        queryKey: ["ehcs", "agent-embed", agentId],
        queryFn: () => getAgent(agentId),
        enabled: Boolean(agentId),
        staleTime: 60_000,
    });

    const embed = useMemo(() => {
        const agent = agentQuery.data;
        if (!agentId || !agent) {
            return null;
        }
        const publish = agent.publishConfig as
            | { enableSite?: boolean; accessToken?: string | null }
            | undefined;
        if (!publish?.enableSite || !publish.accessToken) {
            return {
                ready: false as const,
                reason: "publish_disabled" as const,
                agentName: agent.name,
            };
        }
        const publicUrl = buildAgentPublicUrl(agentId, publish.accessToken);
        return {
            ready: true as const,
            publicUrl,
            floatingScript: buildFloatingEmbedScript(publicUrl, "desktop"),
            agentName: agent.name,
        };
    }, [agentId, agentQuery.data]);

    return {
        agentId,
        loading: agentQuery.isLoading || agentQuery.isFetching,
        embed,
        reloadSettings,
    };
}
