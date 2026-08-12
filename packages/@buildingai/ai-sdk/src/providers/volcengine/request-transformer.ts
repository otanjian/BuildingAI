/**
 * Volcengine Ark (Doubao) rejects `tool_choice` for many online-inference
 * endpoints, while still supporting function calling when `tools` is set
 * without `tool_choice`. Strip the field so OpenAI-compatible defaults
 * (`tool_choice: "auto"`) do not break tool use.
 */
export const transformVolcengineRequestBody = (
    args: Record<string, any>,
): Record<string, any> => {
    if (!args || typeof args !== "object") {
        return args;
    }

    if (!("tool_choice" in args)) {
        return args;
    }

    const { tool_choice: _toolChoice, ...rest } = args;
    return rest;
};
