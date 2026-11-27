import test from "node:test";
import assert from "node:assert/strict";
import {
  extractFrontMatter,
  extractMarkdownHeadings,
  markdownStats,
  slugifyHeading,
} from "../src/markdown-utils.js";

test("extracts ATX headings and ignores headings inside fenced code", () => {
  const markdown = `# Title

## Section

\`\`\`md
# Not a heading
\`\`\`

### Details ###

Setext heading
---`;
  assert.deepEqual(extractMarkdownHeadings(markdown), [
    { level: 1, text: "Title", line: 1 },
    { level: 2, text: "Section", line: 3 },
    { level: 3, text: "Details", line: 9 },
  ]);
});

test("counts CJK and Latin words and estimates reading time", () => {
  const stats = markdownStats("# 标题\n\nHello world from Markdown.");
  assert.equal(stats.lines, 3);
  assert.equal(stats.words, 6);
  assert.equal(stats.readMinutes, 1);
  assert.ok(stats.characters > 0);
});

test("creates stable Unicode heading slugs", () => {
  assert.equal(slugifyHeading("Hello, JSON View!"), "hello-json-view");
  assert.equal(slugifyHeading("项目 概览"), "项目-概览");
  assert.equal(slugifyHeading("***"), "section");
});

test("extracts YAML front matter and removes it from rendered Markdown", () => {
  const markdown = `---
title: Release notes
date: 2026-11-27
draft: false
tags:
  - markdown
  - release
author:
  name: AITools
---

# Body heading

Content.`;
  const result = extractFrontMatter(markdown);
  assert.equal(result.present, true);
  assert.equal(result.valid, true);
  assert.equal(result.data.title, "Release notes");
  assert.equal(result.data.draft, false);
  assert.deepEqual(result.data.tags, ["markdown", "release"]);
  assert.equal(result.data.author.name, "AITools");
  assert.equal(result.fieldCount, 5);
  assert.equal(result.content, "# Body heading\n\nContent.");
});

test("supports BOM and CRLF front matter", () => {
  const markdown = "\uFEFF---\r\ntitle: Windows document\r\nstatus: published\r\n---\r\n# Start\r\n";
  const result = extractFrontMatter(markdown);
  assert.equal(result.valid, true);
  assert.equal(result.data.title, "Windows document");
  assert.equal(result.content, "# Start\r\n");
});

test("preserves Markdown body and reports invalid YAML metadata", () => {
  const markdown = `---
title: "unterminated
tags: [a, b
---
# Still visible`;
  const result = extractFrontMatter(markdown);
  assert.equal(result.present, true);
  assert.equal(result.valid, false);
  assert.equal(result.content, "# Still visible");
  assert.equal(typeof result.error.line, "number");
  assert.equal(typeof result.error.column, "number");
});

test("leaves Markdown unchanged when front matter is absent", () => {
  const markdown = "# Normal Markdown\n\n---\n\nBody";
  const result = extractFrontMatter(markdown);
  assert.equal(result.present, false);
  assert.equal(result.content, markdown);
});
