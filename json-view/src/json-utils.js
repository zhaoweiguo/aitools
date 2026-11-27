import { jsonrepair } from "jsonrepair";

const EMPTY_STATS = Object.freeze({
  type: "—",
  nodes: 0,
  keys: 0,
  objects: 0,
  arrays: 0,
  maxDepth: 0,
});

export function stripBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

export function summarizeJson(value) {
  if (value === undefined) return { ...EMPTY_STATS };
  const stats = { ...EMPTY_STATS, type: Array.isArray(value) ? "array" : typeof value };
  const stack = [{ value, depth: 0 }];

  while (stack.length) {
    const entry = stack.pop();
    if (!entry) continue;
    const current = entry.value;
    stats.nodes += 1;
    stats.maxDepth = Math.max(stats.maxDepth, entry.depth);

    if (Array.isArray(current)) {
      stats.arrays += 1;
      for (const child of current) {
        stack.push({ value: child, depth: entry.depth + 1 });
      }
      continue;
    }

    if (current && typeof current === "object") {
      stats.objects += 1;
      const entries = Object.entries(current);
      stats.keys += entries.length;
      for (const [, child] of entries) {
        stack.push({ value: child, depth: entry.depth + 1 });
      }
    }
  }

  return stats;
}

export function explainJsonError(error, source) {
  const message = error instanceof Error ? error.message : String(error);
  const lineMatch = message.match(/\bline\s+(\d+)\s+column\s+(\d+)/i);
  const positionMatch = message.match(/\bposition\s+(\d+)/i);
  let line = lineMatch ? Number(lineMatch[1]) : null;
  let column = lineMatch ? Number(lineMatch[2]) : null;

  if ((!line || !column) && positionMatch) {
    const position = Math.min(Number(positionMatch[1]), source.length);
    const before = source.slice(0, position);
    const lines = before.split(/\r?\n/);
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
  }

  if (!line || !column) {
    const tokenMatch = message.match(/Unexpected token ['"]([^'"]+)['"]/i);
    if (tokenMatch) {
      let position = source.indexOf(tokenMatch[1]);
      if (position < 0) position = source.lastIndexOf(tokenMatch[1]);
      if (position >= 0) {
        const before = source.slice(0, position);
        const lines = before.split(/\r?\n/);
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
    } else if (/unexpected end/i.test(message)) {
      const lines = source.split(/\r?\n/);
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }
  }

  return {
    message: message.replace(/^JSON\.parse:\s*/i, "").replace(/^Unexpected token.*?in JSON at position/i, "Unexpected token at position"),
    line,
    column,
  };
}

export function formatJson(input, options = {}) {
  const indent = Number(options.indent ?? 2);
  const minify = Boolean(options.minify);
  const source = stripBom(input);

  if (!source.trim()) {
    return {
      ok: true,
      valid: true,
      repaired: false,
      empty: true,
      formatted: "",
      parsed: undefined,
      stats: { ...EMPTY_STATS },
      bytes: 0,
      error: null,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (strictError) {
    const originalError = explainJsonError(strictError, source);
    try {
      const repairedSource = jsonrepair(source);
      const repairedParsed = JSON.parse(repairedSource);
      const formatted = minify
        ? JSON.stringify(repairedParsed)
        : JSON.stringify(repairedParsed, null, indent);
      return {
        ok: false,
        valid: false,
        repaired: true,
        empty: false,
        formatted,
        parsed: repairedParsed,
        repairedSource,
        stats: summarizeJson(repairedParsed),
        bytes: new TextEncoder().encode(formatted).length,
        error: {
          ...originalError,
          message: originalError.message,
        },
      };
    } catch (repairError) {
      return {
        ok: false,
        valid: false,
        repaired: false,
        empty: false,
        formatted: "",
        parsed: undefined,
        stats: { ...EMPTY_STATS },
        bytes: 0,
        error: {
          ...originalError,
          repairMessage:
            repairError instanceof Error ? repairError.message : String(repairError),
        },
      };
    }
  }

  const formatted = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
  return {
    ok: true,
    valid: true,
    repaired: false,
    empty: false,
    formatted,
    parsed,
    stats: summarizeJson(parsed),
    bytes: new TextEncoder().encode(formatted).length,
    error: null,
  };
}

export function jsonTypeLabel(value) {
  if (Array.isArray(value)) return "Array";
  if (value === null) return "Null";
  if (value === undefined) return "—";
  return value.constructor?.name || typeof value;
}

export function countLines(value) {
  if (!value) return 0;
  return String(value).split(/\r?\n/).length;
}
