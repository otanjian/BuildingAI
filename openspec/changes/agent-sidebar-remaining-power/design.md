## Context

Explore decided: show remaining balance next to rate using `userInfo.power`; hide when logged out; refresh after billing.

## Goals / Non-Goals

**Goals:**

- Sidebar: `1 积分 / 1k tokens` + `剩余 N` (same row, wrap-friendly)
- Login-only
- Refresh balance after successful billed turns

**Non-Goals:**

- Site-chat public panel (no equivalent consumption block today)
- Opening PowerDetailDialog from this label (can add later)
- Breaking down membership vs recharge gift in this row

## Decisions

1. **Layout:** same flex row as rate, muted `剩余 {n}` with tabular nums (`justify-between` when space allows / gap otherwise).
2. **Data:** `useAuthStore` → `userInfo?.power`; format with locale string.
3. **Refresh:** on stream `data-usage` when `userConsumedPower` is a positive number, `queryClient.invalidateQueries({ queryKey: ["user", "info"] })` — main layout `useRefreshUser` will sync store.
4. **Free agents:** still show remaining power (balance is global, not agent-specific).

## Risks

- Brief lag until invalidate completes after stream end — acceptable.
- Stale power if turn fails after deduct edge cases — existing billing owns correctness.
