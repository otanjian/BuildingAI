import assert from "node:assert/strict";
import { describe, it } from "node:test";

/* global File */
import {
  getAvailableFileTypes,
  resolveAvailableFileTypes,
  validateFilesAgainstTypes,
} from "./file-upload-types.ts";

describe("resolveAvailableFileTypes", () => {
  it("uses features when override is omitted", () => {
    assert.deepEqual(resolveAvailableFileTypes(["vision"]), ["file", "image"]);
  });

  it("blocks all uploads when override is an empty list", () => {
    assert.deepEqual(resolveAvailableFileTypes(["vision"], []), []);
  });

  it("unions file-only override with vision feature so images are allowed", () => {
    assert.deepEqual(resolveAvailableFileTypes(["vision", "tool-call"], ["file"]), [
      "file",
      "image",
    ]);
  });

  it("keeps override types when features add nothing extra", () => {
    assert.deepEqual(resolveAvailableFileTypes(["tool-call"], ["file", "image"]), [
      "file",
      "image",
    ]);
  });

  it("defaults empty features to file+image and unions with file-only override", () => {
    assert.deepEqual(resolveAvailableFileTypes([], ["file"]), ["file", "image"]);
    assert.deepEqual(resolveAvailableFileTypes(undefined, ["file"]), ["file", "image"]);
  });
});

describe("getAvailableFileTypes / validateFilesAgainstTypes", () => {
  it("rejects images when only file is available", () => {
    const image = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    const result = validateFilesAgainstTypes([image], ["file"]);
    assert.equal(result.validFiles.length, 0);
    assert.deepEqual(result.unsupportedTypeLabels, ["图片"]);
  });

  it("allows images when features are unknown/empty", () => {
    assert.deepEqual(getAvailableFileTypes([]), ["file", "image"]);
    const image = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    const result = validateFilesAgainstTypes([image], getAvailableFileTypes([]));
    assert.equal(result.validFiles.length, 1);
  });

  it("accepts images when vision is available via resolve", () => {
    const image = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    const types = resolveAvailableFileTypes(["vision"], ["file"]);
    const result = validateFilesAgainstTypes([image], types);
    assert.equal(result.validFiles.length, 1);
    assert.equal(result.invalidFiles.length, 0);
  });
});
