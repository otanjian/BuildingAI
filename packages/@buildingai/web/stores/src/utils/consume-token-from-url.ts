import { useAuthStore } from "../slices/auth.slice"

/**
 * Synchronously extract and consume the base64-encoded auth token from URL search params (_t).
 * Must run before AuthGuard / route guards check isLogin().
 */
export function consumeTokenFromUrl(): void {
  if (typeof window === "undefined") return

  const params = new URLSearchParams(window.location.search)
  const encoded = params.get("_t")
  if (!encoded) return

  try {
    let token = atob(encoded)
    if (token.includes("%")) {
      token = decodeURIComponent(token)
    }
    if (token) {
      useAuthStore.getState().authActions.setToken(token)
    }
  } catch {
    try {
      const token = decodeURIComponent(atob(encoded))
      if (token) {
        useAuthStore.getState().authActions.setToken(token)
      }
    } catch {
      // ignore invalid token payload
    }
  }

  params.delete("_t")
  const cleanUrl =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : "") +
    window.location.hash
  window.history.replaceState({}, "", cleanUrl)
}
