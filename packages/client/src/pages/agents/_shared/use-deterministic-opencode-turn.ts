import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import {
  DeterministicOpencodeTurnClient,
  type OpencodeTurnActivity,
  type OpencodeTurnStatusResult,
  type OpencodeTurnTransport,
} from "./opencode-turn-client";

export function useDeterministicOpencodeTurn(options: {
  enabled: boolean;
  transport: OpencodeTurnTransport;
  initialActivity?: OpencodeTurnActivity | null;
  onAccepted?: (
    turn: import("./opencode-turn-client").AcceptedOpencodeTurn,
  ) => void | Promise<void>;
  onTerminal: (status: OpencodeTurnStatusResult) => void | Promise<void>;
}) {
  const onTerminalRef = useRef(options.onTerminal);
  onTerminalRef.current = options.onTerminal;
  const onAcceptedRef = useRef(options.onAccepted);
  onAcceptedRef.current = options.onAccepted;
  const client = useMemo(
    () =>
      new DeterministicOpencodeTurnClient({
        transport: options.transport,
        onAccepted: (turn) => onAcceptedRef.current?.(turn),
        onTerminal: (status) => onTerminalRef.current(status),
      }),
    [options.transport],
  );

  useEffect(() => {
    if (options.enabled && options.initialActivity) {
      client.hydrate(options.initialActivity);
    }
  }, [client, options.enabled, options.initialActivity]);

  useEffect(() => () => client.dispose(), [client]);

  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  return { client, snapshot };
}
