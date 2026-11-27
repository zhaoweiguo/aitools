import test from "node:test";
import assert from "node:assert/strict";
import {
  countLines,
  explainJsonError,
  formatJson,
  jsonTypeLabel,
  stripBom,
  summarizeJson,
} from "../src/json-utils.js";

test("formats valid JSON with two and four space indentation", () => {
  const source = '{"name":"ATIF","enabled":true,"count":2}';
  const two = formatJson(source, { indent: 2 });
  const four = formatJson(source, { indent: 4 });
  assert.equal(two.ok, true);
  assert.match(two.formatted, /\n  "name": "ATIF"/);
  assert.match(four.formatted, /\n    "name": "ATIF"/);
  assert.equal(two.parsed.name, "ATIF");
});

test("minifies valid JSON and reports byte length", () => {
  const result = formatJson('{\n  "tools": [\n    "atif",\n    "json"\n  ]\n}', {
    minify: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.formatted, '{"tools":["atif","json"]}');
  assert.equal(result.bytes, new TextEncoder().encode(result.formatted).length);
});

test("summarizes nested object and array structure", () => {
  const value = {
    name: "x",
    tags: ["a", "b"],
    meta: { active: true },
  };
  assert.deepEqual(summarizeJson(value), {
    type: "object",
    nodes: 7,
    keys: 4,
    objects: 2,
    arrays: 1,
    maxDepth: 2,
  });
});

test("reports line and column for malformed but repairable JSON", () => {
  const source = '{\n  "ok": true,\n  "broken":\n}';
  const result = formatJson(source);
  assert.equal(result.ok, false);
  assert.equal(result.valid, false);
  assert.equal(result.repaired, true);
  assert.ok(result.formatted.includes('"ok": true'));
  assert.equal(result.error.line, 4);
  assert.equal(typeof result.error.column, "number");
  assert.ok(result.error.column > 0);
});

test("repairs common syntax mistakes and keeps the strict error warning", () => {
  const source = "{name: 'AITools', items: [1, 2,], enabled: true,}";
  const result = formatJson(source);
  assert.equal(result.valid, false);
  assert.equal(result.repaired, true);
  assert.ok(result.error);
  assert.deepEqual(JSON.parse(result.formatted), {
    name: "AITools",
    items: [1, 2],
    enabled: true,
  });
});

test("returns no repaired output when JSON cannot be recovered", () => {
  const result = formatJson("}{");
  assert.equal(result.valid, false);
  assert.equal(result.repaired, false);
  assert.equal(result.formatted, "");
  assert.ok(result.error);
});

test("handles empty input, BOM, line counts, and primitive types", () => {
  assert.equal(formatJson("   ").empty, true);
  assert.equal(stripBom("\uFEFF{}"), "{}");
  assert.equal(countLines("a\nb\nc"), 3);
  assert.equal(jsonTypeLabel([]), "Array");
  assert.equal(jsonTypeLabel(null), "Null");
  assert.equal(jsonTypeLabel(2), "Number");
});

test("extracts position from browser-style parse messages", () => {
  const error = new SyntaxError("Expected property name or '}' in JSON at position 2 (line 1 column 3)");
  assert.deepEqual(explainJsonError(error, '{"x":1}'), {
    message: error.message,
    line: 1,
    column: 3,
  });
});
