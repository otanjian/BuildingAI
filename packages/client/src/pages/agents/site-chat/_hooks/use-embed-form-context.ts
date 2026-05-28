import type { FormFieldConfig } from "@buildingai/types/ai/agent-config.interface";
import { useEffect, useMemo, useRef } from "react";

export const EMBED_FORM_CONTEXT_MESSAGE = "buildingai-set-form-context";
export const LEGACY_EMBED_FORM_CONTEXT_MESSAGE = "bowiai_host_context";
export const EMBED_FORM_CONTEXT_ACK = "buildingai-form-context-ack";
export const EMBED_READY_MESSAGE = "buildingai-embed-ready";

const QUERY_PREFIX = "ctx_";

function normalizeContextValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function normalizeIncomingPayload(raw: Record<string, unknown>): Record<string, unknown> {
  if (typeof raw.url === "string" && !raw.erp_page_url) {
    return {
      erp_page_url: raw.url,
      erp_doctype: raw.doctype ?? raw.erp_doctype,
      erp_docname: raw.docname ?? raw.erp_docname,
      erp_route: raw.route ?? raw.erp_route,
      erp_context_json: raw.page_context ?? raw.erp_context_json,
    };
  }
  return raw;
}

function readQueryContext(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const updates: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (!key.startsWith(QUERY_PREFIX)) continue;
    const name = key.slice(QUERY_PREFIX.length);
    const trimmed = value.trim();
    if (name && trimmed) {
      updates[name] = trimmed;
    }
  }
  return updates;
}

function pickFieldUpdates(
  fieldNames: Set<string>,
  payload: Record<string, unknown>,
): Record<string, string> {
  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!fieldNames.has(key)) continue;
    const normalized = normalizeContextValue(value).trim();
    if (normalized) updates[key] = normalized;
  }
  return updates;
}

function mergeUpdates(
  current: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  if (Object.keys(incoming).length === 0) return current;
  return { ...current, ...incoming };
}

/**
 * Sync form field values from parent iframe postMessage or URL query (?ctx_field=value).
 * Buffers early host messages until agent formFields are loaded from API.
 */
export function useEmbedFormContext(
  formFields: FormFieldConfig[],
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  const fieldNames = useMemo(() => new Set(formFields.map((f) => f.name)), [formFields]);
  const fieldNamesRef = useRef(fieldNames);
  const pendingPayloadRef = useRef<Record<string, unknown>>({});
  const queryContextRef = useRef<Record<string, string>>(readQueryContext());
  const appliedRef = useRef(false);

  useEffect(() => {
    fieldNamesRef.current = fieldNames;
  }, [fieldNames]);

  useEffect(() => {
    queryContextRef.current = readQueryContext();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyToFormState = (payload: Record<string, unknown>) => {
      const names = fieldNamesRef.current;
      if (names.size === 0) {
        pendingPayloadRef.current = {
          ...pendingPayloadRef.current,
          ...normalizeIncomingPayload(payload),
        };
        return {};
      }

      const updates = pickFieldUpdates(names, normalizeIncomingPayload(payload));
      if (Object.keys(updates).length > 0) {
        setFormValues((prev) => mergeUpdates(prev, updates));
        appliedRef.current = true;
      }
      return updates;
    };

    const notifyParentReady = () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: EMBED_READY_MESSAGE }, "*");
      }
    };

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      const messageType = (data as { type?: string }).type;
      if (
        messageType !== EMBED_FORM_CONTEXT_MESSAGE &&
        messageType !== LEGACY_EMBED_FORM_CONTEXT_MESSAGE
      ) {
        return;
      }

      const payload = (data as { payload?: unknown }).payload;
      const normalizedPayload =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : (data as Record<string, unknown>);

      const updates = applyToFormState(normalizedPayload);
      const source = event.source;
      if (source && typeof (source as Window).postMessage === "function") {
        (source as Window).postMessage(
          { type: EMBED_FORM_CONTEXT_ACK, payload: updates },
          event.origin || "*",
        );
      }
    };

    window.addEventListener("message", handler);
    notifyParentReady();
    return () => window.removeEventListener("message", handler);
  }, [setFormValues]);

  useEffect(() => {
    if (fieldNames.size === 0) return;

    const merged: Record<string, string> = {};
    Object.assign(merged, pickFieldUpdates(fieldNames, pendingPayloadRef.current));
    Object.assign(merged, pickFieldUpdates(fieldNames, queryContextRef.current));

    if (Object.keys(merged).length > 0) {
      setFormValues((prev) => mergeUpdates(prev, merged));
      appliedRef.current = true;
    }

    pendingPayloadRef.current = {};

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: EMBED_READY_MESSAGE }, "*");
    }
  }, [fieldNames, setFormValues]);
}

export function useHasEmbedFormContext(formValues: Record<string, string>, formFields: FormFieldConfig[]) {
  return useMemo(() => {
    if (typeof window === "undefined" || window.parent === window) return false;
    return formFields.some((field) => (formValues[field.name] ?? "").trim() !== "");
  }, [formFields, formValues]);
}

export const EMBED_HOST_DOCUMENT_CLASS = "embed-host-mode";

/** Apply document-level layout fixes when rendered inside an ERPNext (or other) iframe. */
export function useEmbedHostDocumentClass() {
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    document.documentElement.classList.add(EMBED_HOST_DOCUMENT_CLASS);
    return () => document.documentElement.classList.remove(EMBED_HOST_DOCUMENT_CLASS);
  }, []);
}
