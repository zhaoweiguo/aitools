import test from "node:test";
import assert from "node:assert/strict";
import demo from "../src/lib/demo.js";
import {
  argumentValue,
  contentToText,
  filterSteps,
  formatCost,
  formatDuration,
  parseAtifText,
} from "../src/lib/atif.js";

test("parses an ATIF v1.8 trajectory and computes summary metrics", () => {
  const bundle = parseAtifText(JSON.stringify(demo), "demo.json");
  assert.equal(bundle.primary.schemaVersion, "ATIF-v1.8");
  assert.equal(bundle.primary.steps.length, 10);
  assert.equal(bundle.primary.subagents.length, 1);
  assert.equal(bundle.primary.metrics.totalSteps, 10);
  assert.equal(bundle.primary.metrics.toolCalls, 9);
  assert.ok(bundle.primary.durationMs > 0);
  assert.equal(bundle.primary.steps[2].tools.length, 2);
  assert.equal(bundle.primary.steps[2].tools[0].result?.isError, false);
  assert.equal(bundle.primary.steps[4].tools[0].result?.isError, true);
});

test("parses ATIF JSONL with a trajectory header and one step per line", () => {
  const { steps, ...head } = demo;
  const jsonl = [
    JSON.stringify({ type: "trajectory", ...head }),
    ...steps.map((step) => JSON.stringify({ type: "step", ...step })),
  ].join("\n");
  const bundle = parseAtifText(jsonl, "demo.jsonl");
  assert.equal(bundle.primary.steps.length, steps.length);
  assert.equal(bundle.primary.id, demo.trajectory_id);
});

test("accepts trajectory arrays and object envelopes", () => {
  const arrayBundle = parseAtifText(JSON.stringify([demo]), "array.json");
  assert.equal(arrayBundle.trajectories.length, 1);
  const envelopeBundle = parseAtifText(
    JSON.stringify({ trajectories: [demo] }),
    "envelope.json",
  );
  assert.equal(envelopeBundle.primary.title, "修复支付回调的并发幂等与签名校验");
});

test("normalizes missing optional fields without discarding the document", () => {
  const minimal = {
    schema_version: "ATIF-v1.8",
    agent: { name: "test", version: "1" },
    steps: [{ step_id: 1, source: "user", message: "hello" }],
  };
  const bundle = parseAtifText(JSON.stringify(minimal));
  assert.equal(bundle.primary.steps.length, 1);
  assert.equal(bundle.primary.metrics.toolCalls, 0);
  assert.equal(bundle.primary.metrics.totalSteps, 1);
});

test("handles multimodal content and stringified arguments", () => {
  assert.equal(
    contentToText([
      { type: "text", text: "look" },
      { type: "image", source: { media_type: "image/png", path: "shot.png" } },
    ]),
    "look\n\n[图片: shot.png]",
  );
  assert.equal(argumentValue('{"file_path":"src/app.js"}', ["filePath", "path"]), "src/app.js");
});

test("formats metrics and filters steps by tool content", () => {
  const bundle = parseAtifText(JSON.stringify(demo));
  assert.equal(formatCost(0.1824), "$0.18");
  assert.equal(formatDuration(3760), "3.8s");
  const matches = filterSteps(bundle.primary.steps, { query: "stripe-signature" });
  assert.ok(matches.length >= 1);
  assert.ok(matches.every((step) => step.source === "agent"));
});

test("rejects invalid JSON and non-ATIF objects with actionable messages", () => {
  assert.throws(() => parseAtifText("{"), /无法解析 JSON/);
  assert.throws(
    () => parseAtifText(JSON.stringify({ a: 1 })),
    /缺少 steps 数组/,
  );
  assert.throws(() => parseAtifText(""), /文件为空/);
});
