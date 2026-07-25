# Collapse completed chat tool calls

## Why
Long MCP tool loops flood the chat with completed tool rows and bury the answer.

## What Changes
- Group finished tool calls behind a single “已完成 N 个工具调用” toggle (default collapsed after the turn).
- Keep in-progress tools visible; while streaming, keep the group expanded.
- Individual tool detail panels stay collapsed until opened.

## Scope
Client `ask-assistant-ui` only. No API changes.
