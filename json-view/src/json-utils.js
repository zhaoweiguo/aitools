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

export function formatInvalidJsonStructure(input, indentSize = 2) {
  const source = stripBom(input);
  const structural = new Set(["{", "}", "[", "]", ",", ":"]);
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === '"' || character === "'") {
      const quote = character;
      const start = index;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      tokens.push({ type: "value", value: source.slice(start, index) });
      continue;
    }

    if (structural.has(character)) {
      tokens.push({ type: "symbol", value: character });
      index += 1;
      continue;
    }

    const start = index;
    while (
      index < source.length &&
      !/\s/.test(source[index]) &&
      !structural.has(source[index]) &&
      source[index] !== '"' &&
      source[index] !== "'"
    ) {
      index += 1;
    }
    tokens.push({ type: "value", value: source.slice(start, index) });
  }

  const indent = " ".repeat(Math.max(1, Number(indentSize) || 2));
  const lines = [];
  let depth = 0;
  let current = "";

  const flush = () => {
    if (current.trim()) lines.push(current.trimEnd());
    current = "";
  };

  const appendValue = (value) => {
    if (!current.trim()) current = `${indent.repeat(depth)}${value}`;
    else current += `${current.endsWith(": ") ? "" : " "}${value}`;
  };

  tokens.forEach((token, tokenIndex) => {
    if (token.consumed) return;

    if (token.type === "value") {
      appendValue(token.value);
      return;
    }

    if (token.value === ":") {
      current = `${current.trimEnd()}: `;
      return;
    }

    if (token.value === ",") {
      current += ",";
      flush();
      return;
    }

    if (token.value === "{" || token.value === "[") {
      current += token.value;
      flush();
      depth += 1;
      return;
    }

    flush();
    depth = Math.max(0, depth - 1);
    current = `${indent.repeat(depth)}${token.value}`;
    const next = tokens[tokenIndex + 1];
    if (next?.value === ",") {
      current += ",";
      next.consumed = true;
    }
    flush();
  });
  flush();

  return lines.join("\n");
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
      const fallback = formatInvalidJsonStructure(source, indent);
      return {
        ok: false,
        valid: false,
        repaired: false,
        previewOnly: Boolean(fallback),
        empty: false,
        formatted: fallback,
        parsed: undefined,
        stats: { ...EMPTY_STATS },
        bytes: new TextEncoder().encode(fallback).length,
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

export function findJsonFoldRanges(text) {
  const source = String(text ?? "");
  const ranges = new Map();
  const stack = [];
  let line = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (character === "\n") {
      line += 1;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{" || character === "[") {
      stack.push({
        openChar: character,
        startLine: line,
      });
      continue;
    }

    if (character !== "}" && character !== "]") continue;
    const opened = stack.pop();
    if (!opened || opened.startLine === line) continue;

    const expected = opened.openChar === "{" ? "}" : "]";
    if (character !== expected) continue;

    const lineEnd = source.indexOf("\n", index);
    const suffix = source
      .slice(index + 1, lineEnd === -1 ? source.length : lineEnd)
      .trim();

    ranges.set(opened.startLine, {
      startLine: opened.startLine,
      endLine: line,
      openChar: opened.openChar,
      closeChar: character,
      suffix,
    });
  }

  return ranges;
}
