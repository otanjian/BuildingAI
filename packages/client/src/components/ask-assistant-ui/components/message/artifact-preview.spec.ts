import { describe, expect, it } from "vitest";

import {
  buildArtifactAuthHeaders,
  extractHtmlArtifacts,
  extractPublishAccessToken,
  markHtmlArtifactAutoOpened,
  resolveArtifactFetchUrl,
  shouldAutoOpenHtmlArtifact,
} from "./artifact-preview";

describe("resolveArtifactFetchUrl", () => {
  it("prefixes relative API paths with api base", () => {
    expect(
      resolveArtifactFetchUrl(
        "/api/ai-agents/a/conversations/b/artifacts/index.html",
        "http://localhost:4090",
      ),
    ).toBe("http://localhost:4090/api/ai-agents/a/conversations/b/artifacts/index.html");
  });

  it("keeps absolute and blob URLs", () => {
    expect(resolveArtifactFetchUrl("https://cdn.example/a.html", "")).toBe(
      "https://cdn.example/a.html",
    );
    expect(resolveArtifactFetchUrl("blob:http://localhost/1", "")).toBe("blob:http://localhost/1");
  });
});

describe("buildArtifactAuthHeaders", () => {
  it("prefers publish access token over session JWT on site-chat", () => {
    expect(
      buildArtifactAuthHeaders({
        sessionToken: "jwt-token",
        pathname: "/agents/aid/publish-token/c/cid",
        anonymousIdentifier: "anon-1",
      }),
    ).toEqual({
      Authorization: "Bearer publish-token",
      "X-Anonymous-Identifier": "anon-1",
    });
  });

  it("falls back to session JWT on workspace routes", () => {
    expect(
      buildArtifactAuthHeaders({
        sessionToken: "jwt-token",
        pathname: "/agents/aid/c/cid",
      }),
    ).toEqual({
      Authorization: "Bearer jwt-token",
    });
  });

  it("uses publish access token from pathname when no session", () => {
    expect(
      buildArtifactAuthHeaders({
        sessionToken: null,
        pathname: "/agents/aid/pub%2Fkey/c/cid",
      }),
    ).toEqual({
      Authorization: "Bearer pub/key",
    });
  });
});

describe("extractPublishAccessToken", () => {
  it("returns undefined for non site-chat paths", () => {
    expect(extractPublishAccessToken("/c/uuid")).toBeUndefined();
    expect(extractPublishAccessToken("/agents/aid/c/cid")).toBeUndefined();
    expect(extractPublishAccessToken("/agents/aid/chat")).toBeUndefined();
    expect(extractPublishAccessToken("/agents/aid/configuration")).toBeUndefined();
  });

  it("reads accessToken from site-chat paths", () => {
    expect(extractPublishAccessToken("/agents/aid/pub-token")).toBe("pub-token");
    expect(extractPublishAccessToken("/agents/aid/pub-token/c/cid")).toBe("pub-token");
  });
});

describe("extractHtmlArtifacts", () => {
  it("keeps unique html data-artifact parts with urls", () => {
    expect(
      extractHtmlArtifacts([
        { type: "text", data: "x" },
        { type: "data-artifact", data: { kind: "html", url: "/a.html", title: "a" } },
        { type: "data-artifact", data: { kind: "html", url: "/a.html", title: "dup" } },
        { type: "data-artifact", data: { kind: "pdf", url: "/b.pdf" } },
        { type: "data-artifact", data: { kind: "html" } },
      ]),
    ).toEqual([{ kind: "html", url: "/a.html", title: "a" }]);
  });
});

describe("html artifact auto-open helpers", () => {
  it("marks and skips auto-open for the same url in a session store", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    expect(shouldAutoOpenHtmlArtifact("/api/a/index.html", storage)).toBe(true);
    markHtmlArtifactAutoOpened("/api/a/index.html", storage);
    expect(shouldAutoOpenHtmlArtifact("/api/a/index.html", storage)).toBe(false);
    expect(shouldAutoOpenHtmlArtifact("/api/b/index.html", storage)).toBe(true);
  });
});
