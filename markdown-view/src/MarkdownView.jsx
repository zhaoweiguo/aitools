import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  Check,
  Clipboard,
  Columns2,
  Download,
  Eye,
  FileText,
  Heading2,
  LockKeyhole,
  PencilLine,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  extractFrontMatter,
  extractMarkdownHeadings,
  markdownStats,
  SAMPLE_MARKDOWN,
  slugifyHeading,
} from "./markdown-utils.js";

const VIEW_MODES = [
  { id: "split", label: "分屏", icon: Columns2 },
  { id: "editor", label: "编辑", icon: PencilLine },
  { id: "preview", label: "预览", icon: Eye },
];

function nodeText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && node.props) return nodeText(node.props.children);
  return "";
}

function MarkdownHeading({ level, children }) {
  const text = nodeText(children);
  const id = slugifyHeading(text);
  const Tag = `h${level}`;
  return <Tag id={id}>{children}</Tag>;
}

function FrontMatterValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="fm-null">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className={`fm-boolean ${value ? "true" : "false"}`}>{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="fm-number">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => ["string", "number", "boolean"].includes(typeof item))) {
      return (
        <span className="fm-tags">
          {value.map((item, index) => <span key={index}>{String(item)}</span>)}
        </span>
      );
    }
    return <pre className="fm-json">{JSON.stringify(value, null, 2)}</pre>;
  }
  if (typeof value === "object") {
    return <pre className="fm-json">{JSON.stringify(value, null, 2)}</pre>;
  }
  if (/^https?:\/\//.test(value)) {
    return <a href={value} target="_blank" rel="noreferrer noopener">{value}</a>;
  }
  if (String(value).includes("\n")) {
    return <pre className="fm-text">{value}</pre>;
  }
  return <span className="fm-string">{String(value)}</span>;
}

function FrontMatterPanel({ frontMatter }) {
  if (!frontMatter.present) return null;
  if (!frontMatter.valid) {
    return (
      <section className="frontmatter-panel has-error" aria-label="YAML Front Matter">
        <div className="frontmatter-heading">
          <div>
            <span>YAML FRONT MATTER</span>
            <strong>元数据解析失败</strong>
          </div>
          <span className="frontmatter-status error">ERROR</span>
        </div>
        <div className="frontmatter-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>YAML 格式有误，正文仍会继续预览</strong>
            <p>{frontMatter.error?.message}</p>
            {frontMatter.error?.line && (
              <code>YAML 第 {frontMatter.error.line} 行，第 {frontMatter.error.column} 列</code>
            )}
          </div>
        </div>
      </section>
    );
  }

  const entries =
    frontMatter.data && typeof frontMatter.data === "object" && !Array.isArray(frontMatter.data)
      ? Object.entries(frontMatter.data)
      : [["value", frontMatter.data]];
  return (
    <section className="frontmatter-panel" aria-label="YAML Front Matter">
      <div className="frontmatter-heading">
        <div>
          <span>YAML FRONT MATTER</span>
          <strong>文档元数据</strong>
        </div>
        <span className="frontmatter-status">{frontMatter.fieldCount} fields</span>
      </div>
      {entries.length ? (
        <dl className="frontmatter-grid">
          {entries.map(([key, value]) => (
            <div className="frontmatter-row" key={key}>
              <dt>{key}</dt>
              <dd><FrontMatterValue value={value} /></dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="frontmatter-empty">Front Matter 为空</div>
      )}
    </section>
  );
}

function MarkdownBody({ source, frontMatter }) {
  if (!source.trim() && !frontMatter.present) {
    return (
      <div className="markdown-empty">
        <span><BookOpenText size={28} /></span>
        <strong>预览会显示在这里</strong>
        <p>在左侧输入 Markdown，或打开一个文件。</p>
      </div>
    );
  }

  return (
    <>
      <FrontMatterPanel frontMatter={frontMatter} />
      {source.trim() ? (
        <article className="markdown-rendered">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <MarkdownHeading level={1}>{children}</MarkdownHeading>,
              h2: ({ children }) => <MarkdownHeading level={2}>{children}</MarkdownHeading>,
              h3: ({ children }) => <MarkdownHeading level={3}>{children}</MarkdownHeading>,
              h4: ({ children }) => <MarkdownHeading level={4}>{children}</MarkdownHeading>,
              h5: ({ children }) => <MarkdownHeading level={5}>{children}</MarkdownHeading>,
              h6: ({ children }) => <MarkdownHeading level={6}>{children}</MarkdownHeading>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
              ),
            }}
          >
            {source}
          </ReactMarkdown>
        </article>
      ) : (
        <div className="markdown-body-empty">Front Matter 下方暂无正文</div>
      )}
    </>
  );
}

function DropOverlay() {
  return (
    <div className="markdown-drop-overlay">
      <div>
        <FileText size={30} />
        <strong>放开以读取 Markdown</strong>
        <span>文件仅在当前浏览器处理</span>
      </div>
    </div>
  );
}

export default function MarkdownView() {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [viewMode, setViewMode] = useState("split");
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const frontMatter = useMemo(() => extractFrontMatter(source), [source]);
  const deferredSource = useDeferredValue(frontMatter.content);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
    if (file.size > 10 * 1024 * 1024) {
      setNotice("文件超过 10 MB，请使用更小的 Markdown 文件。");
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

  async function copyMarkdown() {
    if (!source) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(source);
      setCopied(true);
    } catch {
      setNotice("浏览器未允许访问剪贴板。");
    }
  }

  function downloadMarkdown() {
    if (!source) return;
    const base = fileName ? fileName.replace(/\.(md|markdown|txt)$/i, "") : "document";
    const blob = new Blob([source], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${base}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setSource("");
    setFileName("");
    setNotice("");
  }

  function loadSample() {
    setSource(SAMPLE_MARKDOWN);
    setFileName("example.md");
    setNotice("已加载示例 Markdown");
  }

  const stats = useMemo(() => markdownStats(frontMatter.content), [frontMatter.content]);
  const headings = useMemo(
    () => extractMarkdownHeadings(frontMatter.content),
    [frontMatter.content],
  );
  const inputLines = source ? source.split(/\r?\n/).length : 0;

  return (
    <div className="markdown-shell">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) loadFile(file);
        }}
      />

      <header className="markdown-header">
        <div className="markdown-header-left">
          <a className="markdown-brand" href="/" aria-label="返回工具首页">
            <span className="markdown-brand-mark"><BookOpenText size={17} /></span>
            <span>
              <strong>Markdown View</strong>
              <small>Editor & preview</small>
            </span>
          </a>
          <span className="markdown-header-separator" />
          <a className="markdown-back-link" href="/">
            <ArrowLeft size={14} />
            所有工具
          </a>
        </div>
        <div className="markdown-header-actions">
          <span className="markdown-local-badge"><LockKeyhole size={13} />本地处理</span>
          <button type="button" className="markdown-primary-button" onClick={() => inputRef.current?.click()}>
            <Upload size={15} />
            打开 Markdown
          </button>
        </div>
      </header>

      <main className="markdown-main">
        <div className="markdown-title-row">
          <div>
            <span className="markdown-eyebrow">MARKDOWN / UTILITY 03</span>
            <h1>Markdown Preview</h1>
            <p>边写边看，支持 GitHub Flavored Markdown。</p>
          </div>
          <div className="markdown-view-switch" role="group" aria-label="预览模式">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  type="button"
                  key={mode.id}
                  className={viewMode === mode.id ? "active" : ""}
                  onClick={() => setViewMode(mode.id)}
                >
                  <Icon size={13} />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="markdown-toolbar">
          <div className="markdown-source-file">
            <FileText size={15} />
            <span>{fileName || "未选择文件"}</span>
            {source && <small>{stats.characters.toLocaleString("zh-CN")} 字符</small>}
          </div>
          <div className="markdown-toolbar-actions">
            <button type="button" onClick={() => inputRef.current?.click()} title="打开 Markdown 文件">
              <Upload size={14} />
              打开
            </button>
            <button type="button" onClick={loadSample} title="加载示例 Markdown">
              <Sparkles size={14} />
              示例
            </button>
            <button
              type="button"
              onClick={copyMarkdown}
              disabled={!source}
              title="复制 Markdown 源文"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "已复制" : "复制"}
            </button>
            <button type="button" onClick={downloadMarkdown} disabled={!source} title="下载 Markdown">
              <Download size={14} />
              下载
            </button>
            <button type="button" onClick={clearAll} disabled={!source} title="清空内容">
              <Trash2 size={14} />
              清空
            </button>
          </div>
        </div>

        <div className={`markdown-workspace mode-${viewMode}`}>
          <section className="markdown-pane markdown-editor-pane">
            <div className="markdown-pane-heading">
              <div>
                <span className="markdown-pane-label">MARKDOWN</span>
                <strong>源文档</strong>
              </div>
              <span>{inputLines ? `${inputLines} 行` : "空"}</span>
            </div>
            <textarea
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                if (fileName) setFileName("");
              }}
              spellCheck="false"
              aria-label="Markdown 输入"
              placeholder={"# 开始写作\n\n支持 Markdown、表格、任务列表和代码块。"}
            />
            <div className="markdown-pane-footer">
              <span>{stats.words ? `${stats.words} 词` : "支持拖入 .md 文件"}</span>
              <span>实时预览</span>
            </div>
          </section>

          <section className="markdown-pane markdown-preview-pane">
            <div className="markdown-pane-heading preview-heading">
              <div>
                <span className="markdown-pane-label">PREVIEW</span>
                <strong>渲染预览</strong>
              </div>
              <span className="preview-heading-meta">
                {frontMatter.present && (
                  <span className={`frontmatter-count ${frontMatter.valid ? "" : "error"}`}>
                    {frontMatter.valid ? `${frontMatter.fieldCount} fields` : "YAML error"}
                  </span>
                )}
                <span className="markdown-outline-count">
                  <Heading2 size={12} />
                  {headings.length}
                </span>
              </span>
            </div>
            <div className="markdown-preview-scroll">
              <MarkdownBody source={deferredSource} frontMatter={frontMatter} />
            </div>
            <div className="markdown-pane-footer">
              <span>{stats.readMinutes ? `约 ${stats.readMinutes} 分钟阅读` : "0 词"}</span>
              <span>GFM</span>
            </div>
          </section>
        </div>

        <div className="markdown-stats-row">
          <div><span>WORDS</span><strong>{stats.words}</strong></div>
          <div><span>CHARACTERS</span><strong>{stats.characters}</strong></div>
          <div><span>HEADINGS</span><strong>{headings.length}</strong></div>
          <div className="markdown-tip">
            <Sparkles size={15} />
            <span>支持粘贴、文件上传与拖拽</span>
          </div>
        </div>
      </main>

      {dragActive && <DropOverlay />}

      {notice && (
        <div className="markdown-toast" role="status">
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
