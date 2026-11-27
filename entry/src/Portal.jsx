import {
  ArrowUpRight,
  Braces,
  FileText,
  GitBranch,
  LockKeyhole,
  Sparkles,
  Waypoints,
  Wrench,
} from "lucide-react";

const TOOLS = [
  {
    id: "atif-view",
    number: "01",
    title: "ATIF Lens",
    category: "Trajectory intelligence",
    description:
      "把 Agent 的执行过程拆成可浏览的步骤、工具调用、运行指标和子代理上下文。",
    href: "/atif-view/",
    icon: Waypoints,
    tone: "mint",
    tags: ["步骤时间线", "工具观察", "运行指标", "子代理"],
  },
  {
    id: "json-view",
    number: "02",
    title: "JSON View",
    category: "Data formatting",
    description:
      "粘贴、拖入或选择 JSON 文件，实时格式化并检查结构、行数和数据规模。",
    href: "/json-view/",
    icon: Braces,
    tone: "amber",
    tags: ["自动格式化", "语法检查", "复制下载", "完全本地"],
  },
  {
    id: "markdown-view",
    number: "03",
    title: "Markdown View",
    category: "Document preview",
    description:
      "编辑 Markdown 并实时查看渲染结果，支持 GitHub Flavored Markdown 扩展。",
    href: "/markdown-view/",
    icon: FileText,
    tone: "blue",
    tags: ["实时预览", "GFM", "文件导入", "完全本地"],
  },
];

function AtifPreview() {
  return (
    <div className="preview-stage atif-preview" aria-hidden="true">
      <div className="preview-topline">
        <span className="window-dots"><i /><i /><i /></span>
        <span>run_7f82a143</span>
        <span className="preview-live">LIVE</span>
      </div>
      <div className="preview-flow">
        <div className="preview-step user"><span>01</span><b /></div>
        <div className="preview-line" />
        <div className="preview-step agent"><span>02</span><b /></div>
        <div className="preview-line" />
        <div className="preview-step tool"><span>03</span><b /></div>
        <div className="preview-line" />
        <div className="preview-step agent"><span>10</span></div>
      </div>
      <div className="preview-tool">
        <Wrench size={14} />
        <code>bash</code>
        <span>completed</span>
      </div>
      <div className="preview-metrics">
        <span><small>STEPS</small>10</span>
        <span><small>TOOLS</small>9</span>
        <span><small>TOKENS</small>56.6k</span>
      </div>
    </div>
  );
}

function JsonPreview() {
  return (
    <div className="preview-stage json-preview" aria-hidden="true">
      <div className="preview-topline">
        <span className="window-dots"><i /><i /><i /></span>
        <span>payload.json</span>
        <span className="preview-valid">VALID</span>
      </div>
      <pre>
        <code>
          <span className="json-line-number">01</span><span className="json-brace">{"{"}</span>{"\n"}
          <span className="json-line-number">02</span>  <span className="json-key">"status"</span><span className="json-punct">:</span> <span className="json-string">"formatted"</span><span className="json-punct">,</span>{"\n"}
          <span className="json-line-number">03</span>  <span className="json-key">"items"</span><span className="json-punct">:</span> <span className="json-punct">[</span>{"\n"}
          <span className="json-line-number">04</span>    <span className="json-number">42</span><span className="json-punct">,</span>{"\n"}
          <span className="json-line-number">05</span>    <span className="json-boolean">true</span>{"\n"}
          <span className="json-line-number">06</span>  <span className="json-punct">]</span>{"\n"}
          <span className="json-line-number">07</span><span className="json-brace">{"}"}</span>
        </code>
      </pre>
      <div className="json-checks">
        <span><i />2 空格缩进</span>
        <span><i />结构有效</span>
      </div>
    </div>
  );
}

function MarkdownPreview() {
  return (
    <div className="preview-stage markdown-preview" aria-hidden="true">
      <div className="preview-topline">
        <span className="window-dots"><i /><i /><i /></span>
        <span>notes.md</span>
        <span className="preview-gfm">GFM</span>
      </div>
      <div className="markdown-mini-page">
        <span className="md-preview-kicker">FIELD NOTES</span>
        <strong>Build for clarity.</strong>
        <p>Tools should stay quick, legible and close to the browser.</p>
        <div className="md-preview-rule" />
        <div className="md-preview-list">
          <span><i />Write in Markdown</span>
          <span><i />See it instantly</span>
          <span><i />Keep data local</span>
        </div>
        <code><b>const</b> preview = <em>true</em>;</code>
      </div>
    </div>
  );
}

function ToolCard({ tool }) {
  const Icon = tool.icon;
  return (
    <a className={`portal-tool-card ${tool.tone}`} href={tool.href}>
      <div className="tool-card-header">
        <span className="tool-index">{tool.number}</span>
        <span className="tool-icon-large">
          <Icon size={21} />
        </span>
        <span className="tool-open">
          打开工具
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="tool-card-copy">
        <span className="tool-category">{tool.category}</span>
        <h2>{tool.title}</h2>
        <p>{tool.description}</p>
      </div>
      {tool.id === "atif-view" && <AtifPreview />}
      {tool.id === "json-view" && <JsonPreview />}
      {tool.id === "markdown-view" && <MarkdownPreview />}
      <div className="tool-tags">
        {tool.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </a>
  );
}

export default function Portal() {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <a href="/" className="portal-brand" aria-label="AITools 首页">
          <span className="portal-mark" aria-hidden="true">
            <i /><i /><i /><b />
          </span>
          <span>
            <strong>AITools</strong>
            <small>Developer workbench</small>
          </span>
        </a>
        <div className="portal-status">
          <span className="status-signal" />
          <span>本地优先</span>
          <i />
          <span>{String(TOOLS.length).padStart(2, "0")} 个工具</span>
        </div>
      </header>

      <main className="portal-main">
        <section className="portal-intro">
          <div>
            <span className="portal-eyebrow">
              TOOL INDEX / {String(TOOLS.length).padStart(2, "0")}
            </span>
            <h1>一个入口，处理手头的活。</h1>
            <p>
              面向日常研发、调试与数据检查的轻量工具集。文件在浏览器内处理，打开即用。
            </p>
          </div>
          <div className="portal-security">
            <span className="security-icon"><LockKeyhole size={17} /></span>
            <span>
              <strong>Local by default</strong>
              <small>文件不会离开当前浏览器</small>
            </span>
          </div>
        </section>

        <section className="portal-tools" aria-label="工具列表">
          {TOOLS.map((tool) => (
            <ToolCard tool={tool} key={tool.id} />
          ))}
        </section>

        <section className="portal-footnote">
          <div>
            <Sparkles size={16} />
            <span>新的工具会继续汇集到这里。</span>
          </div>
          <div>
            <GitBranch size={15} />
            <code>aitool.zhaoweiguo.com</code>
          </div>
        </section>
      </main>

      <footer className="portal-footer">
        <span>AITools</span>
        <span>Browser-native utilities</span>
      </footer>
    </div>
  );
}
