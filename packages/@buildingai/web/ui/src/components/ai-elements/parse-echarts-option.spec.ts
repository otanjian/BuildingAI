import { describe, expect, it } from "vitest";

import { isEchartsFenceLanguage, parseEchartsOption } from "./parse-echarts-option";

describe("isEchartsFenceLanguage", () => {
  it("accepts echarts and echarts-json", () => {
    expect(isEchartsFenceLanguage("echarts")).toBe(true);
    expect(isEchartsFenceLanguage("ECharts")).toBe(true);
    expect(isEchartsFenceLanguage("echarts-json")).toBe(true);
  });

  it("rejects other languages", () => {
    expect(isEchartsFenceLanguage("json")).toBe(false);
    expect(isEchartsFenceLanguage("chart")).toBe(false);
    expect(isEchartsFenceLanguage("")).toBe(false);
  });
});

describe("parseEchartsOption", () => {
  it("parses a valid plain option object", () => {
    const result = parseEchartsOption(`{
      "title": { "text": "Sales" },
      "xAxis": { "type": "category", "data": ["A", "B"] },
      "yAxis": { "type": "value" },
      "series": [{ "type": "bar", "data": [1, 2] }]
    }`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.option).toMatchObject({
        title: { text: "Sales" },
        series: [{ type: "bar", data: [1, 2] }],
      });
    }
  });

  it("allows ECharts template formatter strings", () => {
    const result = parseEchartsOption(`{
      "tooltip": { "formatter": "{b}: {c}" },
      "series": [{ "type": "pie", "data": [{ "name": "A", "value": 1 }] }]
    }`);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    const result = parseEchartsOption(`{ title: `);
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.stringMatching(/json/i),
      }),
    );
  });

  it("rejects arrays and non-objects", () => {
    expect(parseEchartsOption(`[1, 2]`).ok).toBe(false);
    expect(parseEchartsOption(`"hello"`).ok).toBe(false);
    expect(parseEchartsOption(`null`).ok).toBe(false);
  });

  it("rejects function-string formatters", () => {
    const result = parseEchartsOption(`{
      "tooltip": { "formatter": "function (params) { return params.value; }" },
      "series": [{ "type": "bar", "data": [1] }]
    }`);
    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.stringMatching(/executable|formatter|function/i),
      }),
    );
  });

  it("rejects arrow-function string values", () => {
    const result = parseEchartsOption(`{
      "label": { "formatter": "(p) => p.value" },
      "series": [{ "type": "bar", "data": [1] }]
    }`);
    expect(result.ok).toBe(false);
  });
});
