import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  CircleAlert,
  FileUp,
  History,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import demo from "./lib/demo.js";
import { parseAtifText } from "./lib/atif.js";
import Sidebar from "./components/Sidebar.jsx";
import TimelineView from "./components/TimelineView.jsx";
import ToolsView from "./components/ToolsView.jsx";
import MetricsView from "./components/MetricsView.jsx";
import SubagentsView from "./components/SubagentsView.jsx";
import DropOverlay from "./components/DropOverlay.jsx";

const VIEW_DETAILS = {
  timeline: {
    title: "步骤时间线",
    subtitle: "按执行顺序查看消息、推理和工具交互",
    icon: History,
  },
  tools: {
    title: "工具调用",
    subtitle: "调用参数与观察结果按步骤关联",
    icon: Wrench,
  },
  metrics: {
    title: "运行指标",
    subtitle: "Token、成本、延迟与步骤分布",
    icon: ChartNoAxesCombined,
  },
  subagents: {
    title: "子代理",
    subtitle: "浏览嵌套轨迹与委派结果",
    icon: Sparkles,
  },
};

function makeBundleFromDemo() {
  return parseAtifText(JSON.stringify(demo), "payment-webhook-demo.ATIF.json");
}

export default function App() {
  const [bundle, setBundle] = useState(makeBundleFromDemo);
  const [trajectory, setTrajectory] = useState(() => makeBundleFromDemo().primary);
  const [view, setView] = useState("timeline");
  const [query, setQuery] = useState("");
  const [selectedStepId, setSelectedStepId] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState("");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    const handleDragEnter = (event) => {
      event.preventDefault();
      if (!event.dataTransfer?.types?.includes("Files")) return;
      dragDepth.current += 1;
      setDragActive(true);
    };
    const handleDragOver = (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const handleDragLeave = (event) => {
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragActive(false);
    };
    const handleDrop = (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) importFile(file);
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(() => {
    if (!parseError) return undefined;
    const timeout = window.setTimeout(() => setParseError(""), 9000);
    return () => window.clearTimeout(timeout);
  }, [parseError]);

  async function importFile(file) {
    setImporting(true);
    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error("文件超过 100 MB，浏览器工作区可能无法稳定处理。");
      }
      const text = await file.text();
      const nextBundle = parseAtifText(text, file.name);
      const firstStep =
        nextBundle.primary.steps.find((step) => step.source !== "user")?.id ||
        nextBundle.primary.steps[0]?.id ||
        1;
      setBundle(nextBundle);
      setTrajectory(nextBundle.primary);
      setSelectedStepId(firstStep);
      setView("timeline");
      setQuery("");
      setIsDemo(false);
      setMobileSidebar(false);
      setParseError("");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "无法读取这个文件。");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function loadDemo() {
    const next = makeBundleFromDemo();
    setBundle(next);
    setTrajectory(next.primary);
    setSelectedStepId(2);
    setView("timeline");
    setQuery("");
    setIsDemo(true);
    setMobileSidebar(false);
    setParseError("");
  }

  function selectView(nextView) {
    setView(nextView);
    setQuery("");
    setMobileSidebar(false);
  }

  function openTrajectory(next) {
    setTrajectory(next);
    setSelectedStepId(next.steps[0]?.id || 1);
    setQuery("");
  }

  function openStep(stepId) {
    setSelectedStepId(stepId);
    setView("timeline");
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  const ViewIcon = VIEW_DETAILS[view].icon;

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        className="visually-hidden"
        accept=".json,.jsonl,.atif,application/json,application/x-ndjson,text/plain"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importFile(file);
        }}
      />

      <Sidebar
        bundle={bundle}
        trajectory={trajectory}
        view={view}
        onViewChange={selectView}
        onOpenTrajectory={openTrajectory}
        onImport={openFilePicker}
        onDemo={loadDemo}
        isDemo={isDemo}
        mobileOpen={mobileSidebar}
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setMobileSidebar(false)}
      />

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              onClick={() => setMobileSidebar(true)}
              title="打开导航"
            >
              <Menu size={19} />
            </button>
            <button
              type="button"
              className="icon-button desktop-collapse"
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div className="page-heading">
              <div className="page-heading-icon">
                <ViewIcon size={17} />
              </div>
              <div>
                <h1>{VIEW_DETAILS[view].title}</h1>
                <p>{VIEW_DETAILS[view].subtitle}</p>
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="search-field topbar-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={view === "metrics" ? "筛选步骤或模型" : "搜索步骤、工具、内容"}
                aria-label="搜索轨迹"
              />
              {query ? (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setQuery("")}
                  title="清除搜索"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </label>
            <button
              type="button"
              className="primary-button upload-button"
              onClick={openFilePicker}
              disabled={importing}
            >
              <FileUp size={16} />
              <span>{importing ? "读取中" : "打开轨迹"}</span>
            </button>
          </div>
        </header>

        <div className="workspace-scroll">
          {trajectory.id !== bundle.primary.id && (
            <button
              type="button"
              className="back-to-parent"
              onClick={() => openTrajectory(bundle.primary)}
            >
              <ArrowLeft size={15} />
              返回主轨迹
              <span>{bundle.primary.title}</span>
            </button>
          )}

          {view === "timeline" && (
            <TimelineView
              trajectory={trajectory}
              query={query}
              selectedStepId={selectedStepId}
              onSelectStep={setSelectedStepId}
              onOpenSubagent={(id) => {
                const sub = trajectory.subagents.find((item) => item.id === id);
                if (sub) openTrajectory(sub);
              }}
            />
          )}
          {view === "tools" && (
            <ToolsView
              trajectory={trajectory}
              query={query}
              onOpenStep={openStep}
              onOpenSubagent={(id) => {
                const sub = trajectory.subagents.find((item) => item.id === id);
                if (sub) openTrajectory(sub);
              }}
            />
          )}
          {view === "metrics" && (
            <MetricsView
              trajectory={trajectory}
              query={query}
              onOpenStep={openStep}
            />
          )}
          {view === "subagents" && (
            <SubagentsView
              trajectory={trajectory}
              query={query}
              onOpenSubagent={openTrajectory}
            />
          )}
        </div>
      </main>

      {dragActive && <DropOverlay onChoose={openFilePicker} />}

      {parseError && (
        <div className="toast error-toast" role="alert">
          <div className="toast-icon">
            <CircleAlert size={18} />
          </div>
          <div>
            <strong>无法打开轨迹</strong>
            <p>{parseError}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setParseError("")}
            title="关闭"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isDemo && (
        <div className="demo-notice">
          <span className="demo-dot" />
          示例轨迹
          <button type="button" onClick={openFilePicker}>
            打开我的文件
          </button>
        </div>
      )}
    </div>
  );
}
