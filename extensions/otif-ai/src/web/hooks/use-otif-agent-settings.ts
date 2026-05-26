import { getAgent } from "@buildingai/services/web";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import {
    buildAgentPublishEmbedUrl,
    isPublishEmbedReady,
} from "../lib/agent-publish-embed";
import {
    hasRenderableOpeningStatement,
    normalizeOpeningQuestions,
} from "../lib/opening-statement";
import { getSettings } from "../services/settings";

/** Loads OTIF settings agent id and platform agent publish URL for iframe embed. */
export function useOtifAgentSettings() {
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
        queryKey: ["ehcs", "agent-settings", agentId],
        queryFn: () => getAgent(agentId),
        enabled: Boolean(agentId),
        staleTime: 60_000,
    });

    const agent = agentQuery.data;
    const publishConfig = agent?.publishConfig;
    const publishReady = isPublishEmbedReady(publishConfig);
    const accessToken =
        publishConfig?.accessToken && String(publishConfig.accessToken).trim()
            ? String(publishConfig.accessToken).trim()
            : "";

    const publishEmbedUrl =
        agentId && publishReady ? buildAgentPublishEmbedUrl(agentId, accessToken) : null;

    const openingStatement =
        typeof agent?.openingStatement === "string" ? agent.openingStatement : "";
    const openingQuestions = normalizeOpeningQuestions(agent?.openingQuestions);

    return {
        agentId,
        agentName: agent?.name ?? "智能体",
        publishEmbedUrl,
        publishReady,
        openingStatement,
        openingQuestions,
        hasOpeningContent: hasRenderableOpeningStatement(openingStatement),
        hasOpening: hasRenderableOpeningStatement(openingStatement) || openingQuestions.length > 0,
        loading: agentQuery.isLoading || agentQuery.isFetching,
        ready: Boolean(agentId && publishEmbedUrl),
        reloadSettings,
    };
}
