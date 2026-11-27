import test from "node:test";
import assert from "node:assert/strict";
import {
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
