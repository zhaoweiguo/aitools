import {
  AlertTriangle,
  ArrowLeft,
  Braces,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileJson2,
  LockKeyhole,
  Minimize2,
  PanelRightOpen,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { countLines, formatJson, jsonTypeLabel } from "./json-utils.js";

const INDENT_OPTIONS = [
  { value: "2", label: "2 空格" },
  { value: "4", label: "4 空格" },
  { value: "minify", label: "压缩" },
];

function HighlightedLine({ line }) {
  const pattern = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")(?=\s*:)|("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const nodes = [];
  let cursor = 0;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > cursor) nodes.push(line.slice(cursor, match.index));
    const className = match[1]
      ? "json-key"
      : match[2]
        ? "json-string"
        : match[3]
          ? "json-literal"
          : "json-number";
    nodes.push(
      <span className={className} key={`${match.index}-${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = pattern.lastIndex;
  }
  if (cursor < line.length) nodes.push(line.slice(cursor));
  return nodes;
}

function JsonOutput({ result, isPending, onApplyRepair }) {
  const lines = useMemo(
    () => (result.formatted ? result.formatted.split("\n") : []),
    [result.formatted],
  );

  if (!result.formatted) {
    return (
      <div className="json-error-state" role="alert">
        <span className="json-error-icon"><AlertTriangle size={20} /></span>
        <div>
          <strong>JSON 语法错误</strong>
          <p>{result.error?.message || "无法解析这份 JSON。"}</p>
          {result.error?.line && (
            <code>第 {result.error.line} 行，第 {result.error.column} 列</code>
          )}
          {result.error?.repairMessage && (
            <p>自动修复也未成功：{result.error.repairMessage}</p>
          )}
        </div>
      </div>
    );
  }

  if (result.empty) {
    return (
      <div className="json-empty-state">
        <span className="empty-json-icon"><Braces size={26} /></span>
        <strong>格式化结果会显示在这里</strong>
        <p>从文件开始，或直接在左侧输入 JSON。</p>
      </div>
    );
  }

  return (
    <>
      {result.error && (
        <div className="repair-warning" role="alert">
          <span className="repair-warning-icon"><AlertTriangle size={17} /></span>
          <div>
            <strong>原 JSON 有语法问题，已生成修复预览</strong>
            <p>{result.error.message}</p>
            {result.error.line && (
              <code>原内容第 {result.error.line} 行，第 {result.error.column} 列</code>
            )}
            <span>下方结果经过自动修复，可能与原始内容不同。</span>
          </div>
          <button type="button" onClick={onApplyRepair}>采用修复结果</button>
        </div>
      )}
      <div className={`formatted-code ${isPending ? "pending" : ""}`}>
        {lines.length <= 5000 ? (
          lines.map((line, index) => (
            <div className="formatted-line" key={index}>
              <span className="formatted-line-number">{index + 1}</span>
              <code><HighlightedLine line={line} /></code>
            </div>
          ))
        ) : (
          <pre>{result.formatted}</pre>
        )}
      </div>
    </>
  );
}

function DropOverlay() {
  return (
    <div className="json-drop-overlay">
      <div>
        <FileJson2 size={30} />
        <strong>放开以读取 JSON</strong>
        <span>文件仅在当前浏览器处理</span>
      </div>
    </div>
  );
}

export default function JsonView() {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [indentMode, setIndentMode] = useState("2");
  const [result, setResult] = useState(() => formatJson(""));
  const [isFormatting, setIsFormatting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!source.trim()) {
      setResult(formatJson(""));
      setIsFormatting(false);
      return undefined;
    }
    setIsFormatting(true);
    const timer = window.setTimeout(() => {
      setResult(
        formatJson(source, {
          indent: indentMode === "minify" ? 2 : Number(indentMode),
          minify: indentMode === "minify",
        }),
      );
      setIsFormatting(false);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [source, indentMode]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    const enter = (event) => {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    };
    const over = (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const leave = (event) => {
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragActive(false);
    };
    const drop = (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) loadFile(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  async function loadFile(file) {
    if (file.size > 50 * 1024 * 1024) {
      setNotice("文件超过 50 MB，请使用更小的 JSON 文件。");
      return;
    }
    try {
      const text = await file.text();
      setSource(text);
      setFileName(file.name);
      setNotice(`已读取 ${file.name}`);
    } catch {
      setNotice("无法读取这个文件。");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function chooseFile() {
    inputRef.current?.click();
  }

  async function copyFormatted() {
    if (!result.formatted) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(result.formatted);
      setCopied(true);
    } catch {
      setNotice("浏览器未允许访问剪贴板。");
    }
  }

  function downloadFormatted() {
    if (!result.formatted) return;
    const base = fileName ? fileName.replace(/\.json$/i, "") : "formatted";
    const blob = new Blob([result.formatted], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${base}.formatted.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setSource("");
    setFileName("");
    setResult(formatJson(""));
    setNotice("");
  }

  function applyRepairResult() {
    if (!result.formatted) return;
    setSource(result.formatted);
    setFileName("");
    setNotice("已采用修复后的 JSON");
  }

  const inputLines = countLines(source);
  const inputBytes = new TextEncoder().encode(source).length;
  const status = result.error
    ? result.formatted
      ? { label: "已修复预览", tone: "warning" }
      : { label: "需要修正", tone: "error" }
    : isFormatting
      ? { label: "格式化中", tone: "pending" }
      : result.empty
        ? { label: "等待输入", tone: "idle" }
        : { label: "JSON 有效", tone: "valid" };

  return (
    <div className="json-shell">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".json,application/json,text/json,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadFile(file);
        }}
      />

      <header className="json-header">
        <div className="json-header-left">
          <a className="json-brand" href="/" aria-label="返回工具首页">
            <span className="json-brand-mark"><Braces size={17} /></span>
            <span>
              <strong>JSON View</strong>
              <small>Formatter & inspector</small>
            </span>
          </a>
          <span className="header-separator" />
          <a className="back-link" href="/">
            <ArrowLeft size={14} />
            所有工具
          </a>
        </div>
        <div className="json-header-actions">
          <span className="local-badge"><LockKeyhole size={13} />本地处理</span>
          <button type="button" className="json-primary-button" onClick={chooseFile}>
            <Upload size={15} />
            打开 JSON
          </button>
        </div>
      </header>

      <main className="json-main">
        <div className="json-title-row">
          <div>
            <span className="json-eyebrow">JSON / UTILITY 02</span>
            <h1>格式化 JSON</h1>
            <p>输入后自动校验和排版，文件不会离开浏览器。</p>
          </div>
          <div className="format-switch" role="group" aria-label="格式化方式">
            {INDENT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={indentMode === option.value ? "active" : ""}
                onClick={() => setIndentMode(option.value)}
              >
                {option.value === "minify" && <Minimize2 size={12} />}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="json-toolbar">
          <div className="source-file">
            <FileJson2 size={15} />
            <span>{fileName || "未选择文件"}</span>
            {source && <small>{inputBytes.toLocaleString("zh-CN")} bytes</small>}
          </div>
          <div className="json-toolbar-actions">
            <button type="button" onClick={chooseFile} title="打开 JSON 文件">
              <Upload size={14} />
              打开
            </button>
            <button
              type="button"
              className="result-toggle"
              onClick={() => setOutputCollapsed((value) => !value)}
              aria-controls="json-output-pane"
              aria-expanded={!outputCollapsed}
              title={outputCollapsed ? "展开格式化结果" : "收起格式化结果"}
            >
              {outputCollapsed ? <PanelRightOpen size={14} /> : <ChevronDown size={14} />}
              {outputCollapsed ? "展开结果" : "收起结果"}
            </button>
            <button
              type="button"
              onClick={copyFormatted}
              disabled={!result.formatted}
              title="复制格式化结果"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "已复制" : "复制"}
            </button>
            <button
              type="button"
              onClick={downloadFormatted}
              disabled={!result.formatted}
              title="下载格式化结果"
            >
              <Download size={14} />
              下载
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={!source}
              title="清空内容"
            >
              <Trash2 size={14} />
              清空
            </button>
          </div>
        </div>

        <div className={`json-workspace ${outputCollapsed ? "output-collapsed" : ""}`}>
          <section className="json-pane source-pane">
            <div className="pane-heading">
              <div>
                <span className="pane-label">INPUT</span>
                <strong>源 JSON</strong>
              </div>
              <span className="pane-counter">{inputLines ? `${inputLines} 行` : "空"}</span>
            </div>
            <textarea
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                if (fileName) setFileName("");
              }}
              spellCheck="false"
              aria-label="JSON 输入"
              placeholder={'{\n  "project": "aitool",\n  "tools": ["atif-view", "json-view"],\n  "local": true\n}'}
            />
            <div className="pane-footer">
              <span>{inputBytes ? `${inputBytes.toLocaleString("zh-CN")} bytes` : "支持拖入 .json 文件"}</span>
              <span>自动格式化</span>
            </div>
          </section>

          {!outputCollapsed && (
            <section className="json-pane output-pane" id="json-output-pane">
              <div className="pane-heading">
                <div>
                  <span className="pane-label">OUTPUT</span>
                  <strong>格式化结果</strong>
                </div>
                <div className="output-heading-actions">
                  <span className={`validation-badge ${status.tone}`}>
                    <i />
                    {status.label}
                  </span>
                  <button
                    type="button"
                    className="pane-collapse-toggle"
                    onClick={() => setOutputCollapsed(true)}
                    title="收起格式化结果"
                    aria-label="收起格式化结果"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
              <div className="json-output-scroll">
                <JsonOutput
                  result={result}
                  isPending={isFormatting}
                  onApplyRepair={applyRepairResult}
                />
              </div>
              <div className="pane-footer result-stats">
                <span>{result.empty ? "0 行" : `${countLines(result.formatted)} 行`}</span>
                <span>{result.empty ? "0 bytes" : `${result.bytes.toLocaleString("zh-CN")} bytes`}</span>
                {!result.empty && !result.error && (
                  <>
                    <span>{jsonTypeLabel(result.parsed)}</span>
                    <span>{result.stats.keys} keys</span>
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="json-bottom-row">
          <div className="json-stat">
            <span>OBJECTS</span>
            <strong>{result.stats.objects}</strong>
          </div>
          <div className="json-stat">
            <span>ARRAYS</span>
            <strong>{result.stats.arrays}</strong>
          </div>
          <div className="json-stat">
            <span>MAX DEPTH</span>
            <strong>{result.stats.maxDepth}</strong>
          </div>
          <div className="json-tip">
            <Sparkles size={15} />
            <span>支持直接粘贴、拖放文件与实时校验</span>
          </div>
        </div>
      </main>

      {dragActive && <DropOverlay />}

      {notice && (
        <div className="json-toast" role="status">
          <Check size={15} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} title="关闭">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
