import { parse as parseYaml } from "yaml";

export function markdownStats(markdown) {
  const source = String(markdown ?? "");
  const cjk = source.match(/[\p{Script=Han}]/gu)?.length || 0;
  const latinWords = source.match(/[A-Za-z0-9]+(?:['_-][A-Za-z0-9]+)*/g)?.length || 0;
  const words = cjk + latinWords;
  return {
    characters: source.length,
    lines: source ? source.split(/\r?\n/).length : 0,
    words,
    readMinutes: words ? Math.max(1, Math.ceil(words / 300)) : 0,
  };
}

export function extractMarkdownHeadings(markdown) {
  const source = String(markdown ?? "");
  const headings = [];
  let fence = null;

  source.split(/\r?\n/).forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
      return;
    }
    if (fence) return;

    const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) return;
    const text = match[2].replace(/\s+#+\s*$/, "").trim();
    if (!text) return;
    headings.push({
      level: match[1].length,
      text,
      line: index + 1,
    });
  });

  return headings;
}

export function slugifyHeading(text) {
  const slug = String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\](){}]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "section";
}

function frontMatterFieldCount(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") return Object.keys(data).length;
  return data == null ? 0 : 1;
}

export function extractFrontMatter(markdown) {
  const source = String(markdown ?? "").replace(/^\uFEFF/, "");
  const match = source.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) {
    return {
      present: false,
      valid: false,
      data: null,
      raw: "",
      content: source,
      fieldCount: 0,
      error: null,
    };
  }

  const raw = match[1];
  const content = source.slice(match[0].length).replace(/^\r?\n/, "");
  try {
    const data = parseYaml(raw);
    return {
      present: true,
      valid: true,
      data,
      raw,
      content,
      fieldCount: frontMatterFieldCount(data),
      error: null,
    };
  } catch (error) {
    const line = error?.linePos?.[0]?.line ?? null;
    const column = error?.linePos?.[0]?.col ?? null;
    return {
      present: true,
      valid: false,
      data: null,
      raw,
      content,
      fieldCount: 0,
      error: {
        message: String(error?.message || error).split("\n")[0],
        line,
        column,
      },
    };
  }
}

export const SAMPLE_MARKDOWN = `---
title: Markdown Preview
description: A local-first Markdown editor with live GFM rendering.
date: 2026-11-27
author:
  name: AITools
  url: https://aitool.zhaoweiguo.com/
tags:
  - markdown
  - preview
  - gfm
draft: false
---

# Markdown Preview

在左侧写 Markdown，右侧会实时渲染。

## 支持的能力

- 标题、段落与 **强调**
- [链接](https://www.markdownguide.org/)
- \`行内代码\` 与代码块
- 表格、任务列表和删除线

> Markdown 内容仅在当前浏览器处理。

## 任务清单

- [x] 实时预览
- [x] 文件上传
- [ ] 继续添加更多内容

## 代码示例

\`\`\`js
const tools = ["atif-view", "json-view", "markdown-view"];
console.log(tools.join(" / "));
\`\`\`

## 表格

| 工具 | 状态 |
| --- | --- |
| ATIF Lens | Ready |
| JSON View | Ready |
| Markdown View | Ready |
`;
