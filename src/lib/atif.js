const SOURCE_KEYS = new Set(["system", "user", "agent"]);
const MAX_EXPANDED_STEPS = 500;

export function formatNumber(value, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("zh-CN", {
    notation: Number(value) >= 100000 ? "compact" : "standard",
    maximumFractionDigits: 1,
    ...options,
  }).format(Number(value));
}

export function formatCost(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const number = Number(value);
  if (number === 0) return "$0.00";
  return number < 0.01 ? `$${number.toFixed(4)}` : `$${number.toFixed(2)}`;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatClock(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function contentToText(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part.text || "";
        if (part?.type === "image") return `[图片: ${part.source?.path || "未命名"}]`;
        if (part?.type === "audio") return `[音频: ${part.source?.path || "未命名"}]`;
        return JSON.stringify(part, null, 2);
      })
      .filter(Boolean)
      .join("\n\n");
  }
  return typeof content === "string" ? content : JSON.stringify(content, null, 2);
}

export function parseArguments(args) {
  if (args == null) return {};
  if (typeof args === "object") return args;
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args);
      return parsed && typeof parsed === "object" ? parsed : { value: parsed };
    } catch {
      return { input: args };
    }
  }
  return { value: args };
}

export function argumentValue(args, keys = []) {
  const normalizeKey = (key) =>
    String(key || "")
      .replace(/[_-]/g, "")
      .toLowerCase();
  const source = typeof args === "string" ? parseArguments(args) : args;
  const objectSource =
    source && typeof source === "object" && !Array.isArray(source)
      ? source
      : parseArguments(source);
  const wanted = keys.map(normalizeKey);
  const entry = Object.entries(objectSource).find(([key]) =>
    wanted.includes(normalizeKey(key)),
  );
  if (!entry) return "";
  const value = entry[1];
  if (value == null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function meaningfulExtra(extra) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return {};
  return extra;
}

function normalizeToolCall(call, fallbackId) {
  const extra = meaningfulExtra(call?.extra);
  return {
    id: String(
      call?.tool_call_id ??
        call?.toolCallId ??
        call?.id ??
        extra.call_id ??
        `call-${fallbackId}`,
    ),
    name: String(
      call?.function_name ??
        call?.name ??
        call?.tool_name ??
        extra.function_name ??
        "unknown_tool",
    ),
    args: parseMaybeJson(call?.arguments ?? call?.args ?? call?.input ?? {}),
    extra,
  };
}

function normalizeObservationResult(result, index) {
  const extra = meaningfulExtra(result?.extra);
  return {
    id: String(result?.source_call_id ?? result?.id ?? `result-${index}`),
    content: contentToText(result?.content),
    isError:
      Boolean(extra.is_error) ||
      Boolean(extra.error) ||
      ["error", "failed", "failure"].includes(String(extra.status || "").toLowerCase()),
    status: String(extra.status || (extra.is_error ? "error" : "completed")),
    exitCode: extra.exit_code,
    title: extra.title,
    truncated: Boolean(extra.truncated || extra.truncated_by_exporter),
    startedAt: extra.started_at,
    endedAt: extra.ended_at,
    subagentRefs: Array.isArray(result?.subagent_trajectory_ref)
      ? result.subagent_trajectory_ref.map((ref) => ({
          trajectoryId: ref?.trajectory_id,
          trajectoryPath: ref?.trajectory_path,
          sessionId: ref?.session_id,
          extra: meaningfulExtra(ref?.extra),
        }))
      : [],
    extra,
  };
}

function normalizeStep(step, index) {
  const extra = meaningfulExtra(step?.extra);
  const toolCalls = Array.isArray(step?.tool_calls)
    ? step.tool_calls.map((call, callIndex) =>
        normalizeToolCall(call, `${index + 1}-${callIndex + 1}`),
      )
    : [];
  const results = Array.isArray(step?.observation?.results)
    ? step.observation.results.map(normalizeObservationResult)
    : [];
  const resultMap = new Map(results.map((result) => [result.id, result]));
  const tools = toolCalls.map((call) => ({
    ...call,
    result: resultMap.get(call.id) || null,
  }));
  const orphanResults = results.filter(
    (result) => !toolCalls.some((call) => call.id === result.id),
  );
  const metrics = step?.metrics && typeof step.metrics === "object" ? step.metrics : null;
  const timestamp = step?.timestamp || "";
  const text = contentToText(step?.message);
  return {
    id: Number.isFinite(Number(step?.step_id)) ? Number(step.step_id) : index + 1,
    index: index + 1,
    timestamp,
    source: SOURCE_KEYS.has(step?.source) ? step.source : "agent",
    model: step?.model_name || "",
    modelName: step?.model_name || "",
    reasoningEffort: step?.reasoning_effort,
    message: text,
    reasoning: contentToText(step?.reasoning_content),
    tools,
    orphanResults,
    metrics,
    llmCallCount: Number(step?.llm_call_count || 0),
    extra,
    status: extra.status || extra.finish_reason || "",
    mode: extra.mode || "",
  };
}

function sumMetrics(steps) {
  return steps.reduce(
    (total, step) => {
      const metrics = step.metrics || {};
      total.promptTokens += Number(metrics.prompt_tokens || 0);
      total.completionTokens += Number(metrics.completion_tokens || 0);
      total.cachedTokens += Number(metrics.cached_tokens || 0);
      total.costUsd += Number(metrics.cost_usd || 0);
      total.toolCalls += step.tools.length;
      return total;
    },
    {
      promptTokens: 0,
      completionTokens: 0,
      cachedTokens: 0,
      costUsd: 0,
      toolCalls: 0,
    },
  );
}

function normalizeAgent(agent) {
  const value = agent && typeof agent === "object" ? agent : {};
  const extra = meaningfulExtra(value.extra);
  return {
    name: String(value.name || extra.name || "Unknown agent"),
    version: String(value.version || extra.version || ""),
    modelName: String(value.model_name || extra.model_name || ""),
    toolDefinitions: Array.isArray(value.tool_definitions) ? value.tool_definitions : [],
    extra,
  };
}

function normalizeTrajectory(doc, fallbackIndex = 0, path = "") {
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.steps)) {
    throw new Error("文件不是有效的 ATIF 轨迹：缺少 steps 数组。");
  }
  const steps = doc.steps.map(normalizeStep);
  const computedMetrics = sumMetrics(steps);
  const finalMetrics = doc.final_metrics && typeof doc.final_metrics === "object"
    ? doc.final_metrics
    : {};
  const extra = meaningfulExtra(doc.extra);
  const agent = normalizeAgent(doc.agent);
  const subagents = Array.isArray(doc.subagent_trajectories)
    ? doc.subagent_trajectories.map((sub, index) =>
        normalizeTrajectory(sub, index, `${path}subagent-${index}`),
      )
    : [];
  const timestamps = steps
    .map((step) => new Date(step.timestamp).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const firstTimestamp = timestamps[0];
  const lastTimestamp = timestamps[timestamps.length - 1];
  const durationMs =
    Number.isFinite(firstTimestamp) && Number.isFinite(lastTimestamp)
      ? lastTimestamp - firstTimestamp
      : 0;
  const id =
    String(doc.trajectory_id || doc.session_id || extra.session_id || `trajectory-${fallbackIndex + 1}`);
  return {
    id,
    path,
    schemaVersion: String(doc.schema_version || "ATIF"),
    sessionId: doc.session_id ? String(doc.session_id) : "",
    trajectoryId: doc.trajectory_id ? String(doc.trajectory_id) : "",
    agent,
    title: String(
      extra.session_title ||
        extra.title ||
        extra.name ||
        (fallbackIndex ? `Subagent ${fallbackIndex}` : "Untitled trajectory"),
    ),
    notes: typeof doc.notes === "string" ? doc.notes : "",
    extra,
    steps,
    subagents,
    durationMs,
    firstTimestamp,
    lastTimestamp,
    metrics: {
      promptTokens: Number(finalMetrics.total_prompt_tokens ?? computedMetrics.promptTokens),
      completionTokens: Number(
        finalMetrics.total_completion_tokens ?? computedMetrics.completionTokens,
      ),
      cachedTokens: Number(finalMetrics.total_cached_tokens ?? computedMetrics.cachedTokens),
      costUsd: Number(finalMetrics.total_cost_usd ?? computedMetrics.costUsd),
      toolCalls: computedMetrics.toolCalls,
      totalSteps: steps.length,
      agentSteps: steps.filter((step) => step.source === "agent").length,
      userSteps: steps.filter((step) => step.source === "user").length,
      systemSteps: steps.filter((step) => step.source === "system").length,
    },
    raw: doc,
  };
}

function collectTrajectories(doc) {
  if (Array.isArray(doc)) {
    const direct = doc.filter(
      (item) => item && typeof item === "object" && Array.isArray(item.steps),
    );
    if (direct.length === doc.length && direct.length > 0) {
      return direct.map((item, index) => normalizeTrajectory(item, index));
    }
    return doc
      .filter((item) => item && typeof item === "object")
      .map((item, index) => normalizeTrajectory(item, index));
  }
  if (doc?.trajectories && Array.isArray(doc.trajectories)) {
    return doc.trajectories.map((item, index) => normalizeTrajectory(item, index));
  }
  return [normalizeTrajectory(doc)];
}

function parseJsonLines(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const objects = [];
  for (const line of lines) {
    try {
      objects.push(JSON.parse(line));
    } catch {
      return null;
    }
  }
  const header = objects.find((item) => item?.type === "trajectory");
  if (!header) return null;
  const steps = objects.filter((item) => item?.type === "step");
  const { type, ...head } = header;
  return { ...head, steps: steps.map(({ type: ignored, ...step }) => step) };
}

export function parseAtifText(text, fileName = "trajectory.json") {
  const trimmed = String(text || "").replace(/^\uFEFF/, "").trim();
  if (!trimmed) throw new Error("文件为空。");
  let root;
  try {
    root = JSON.parse(trimmed);
  } catch (documentError) {
    root = parseJsonLines(trimmed);
    if (!root) {
      throw new Error(
        `无法解析 JSON：${documentError instanceof Error ? documentError.message : "格式错误"}`,
      );
    }
  }
  let trajectories;
  try {
    trajectories = collectTrajectories(root);
  } catch (error) {
    throw new Error(`${fileName}：${error instanceof Error ? error.message : "不是有效轨迹"}`);
  }
  if (!trajectories.length) throw new Error("文件中没有可查看的轨迹。");
  return {
    fileName,
    importedAt: new Date().toISOString(),
    trajectories,
    primary: trajectories[0],
    sourceBytes: new Blob([text]).size,
  };
}

export function getTrajectoryById(bundle, id) {
  if (!bundle) return null;
  return (
    bundle.trajectories.find((item) => item.id === id || item.trajectoryId === id) ||
    null
  );
}

export function getStepCategory(step) {
  if (step.source === "user") return "用户";
  if (step.source === "system") return "系统";
  if (step.tools.length) return "工具";
  return "推理";
}

export function filterSteps(steps, { query = "", source = "all", toolsOnly = false } = {}) {
  const normalized = query.trim().toLowerCase();
  return steps.filter((step) => {
    if (source !== "all" && step.source !== source) return false;
    if (toolsOnly && !step.tools.length) return false;
    if (!normalized) return true;
    const haystack = [
      step.id,
      step.message,
      step.reasoning,
      step.model,
      step.status,
      ...step.tools.flatMap((tool) => [
        tool.name,
        tool.id,
        JSON.stringify(tool.args),
        tool.result?.content,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function metadataRows(trajectory) {
  const extra = trajectory.extra;
  return [
    ["Agent", trajectory.agent.name],
    ["版本", trajectory.agent.version],
    ["模型", trajectory.agent.modelName || trajectory.steps.find((s) => s.model)?.model || ""],
    ["Session", trajectory.sessionId],
    ["Trajectory", trajectory.trajectoryId || trajectory.id],
    ["项目", extra.project_directory || extra.directory || extra.project || ""],
    ["创建时间", extra.session_created_at || trajectory.steps[0]?.timestamp || ""],
    ["导出时间", extra.exported_at || ""],
  ].filter(([, value]) => value);
}

export function allToolCalls(trajectory) {
  return trajectory.steps.flatMap((step) =>
    step.tools.map((tool) => ({ ...tool, stepId: step.id, step })),
  );
}

export function timelineBounds(steps) {
  const values = steps
    .map((step) => new Date(step.timestamp).getTime())
    .filter(Number.isFinite);
  if (!values.length) return null;
  const start = Math.min(...values);
  const end = Math.max(...values);
  return { start, end, range: Math.max(end - start, 1) };
}
