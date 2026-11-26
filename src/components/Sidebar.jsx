import {
  Activity,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDot,
  FileJson2,
  History,
  Sparkles,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { formatNumber, formatDateTime } from "../lib/atif.js";

const NAV_ITEMS = [
  { id: "timeline", label: "时间线", icon: History, hint: "Steps" },
  { id: "tools", label: "工具调用", icon: Wrench, hint: "Tools" },
  { id: "metrics", label: "运行指标", icon: ChartNoAxesCombined, hint: "Metrics" },
  { id: "subagents", label: "子代理", icon: Sparkles, hint: "Subagents" },
];

export default function Sidebar({
  bundle,
  trajectory,
  view,
  onViewChange,
  onOpenTrajectory,
  onImport,
  onDemo,
  isDemo,
  mobileOpen,
  collapsed,
  onCloseMobile,
}) {
  const toolCount = trajectory.metrics.toolCalls;
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-label="关闭导航"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <div className="brand-copy">
            <strong>ATIF Lens</strong>
            <span>Trajectory viewer</span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close-mobile"
            onClick={onCloseMobile}
            title="关闭导航"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <section className="active-run">
            <div className="active-run-label">
              <span>
                <CircleDot size={13} />
                {isDemo ? "预览轨迹" : "当前轨迹"}
              </span>
              <span className="schema-pill">{trajectory.schemaVersion}</span>
            </div>
            <h2 title={trajectory.title}>{trajectory.title}</h2>
            <div className="run-meta">
              <span>{trajectory.agent.name}</span>
              <span className="meta-separator">/</span>
              <span>{trajectory.agent.modelName || trajectory.steps.find((s) => s.model)?.model || "未知模型"}</span>
            </div>
            <div className="run-stats">
              <div>
                <strong>{formatNumber(trajectory.metrics.totalSteps)}</strong>
                <span>步骤</span>
              </div>
              <div>
                <strong>{formatNumber(toolCount)}</strong>
                <span>工具</span>
              </div>
              <div>
                <strong>{formatNumber(trajectory.metrics.completionTokens)}</strong>
                <span>输出 tok</span>
              </div>
            </div>
          </section>

          <nav className="primary-nav" aria-label="轨迹视图">
            <div className="nav-label">工作区</div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.id === view;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`nav-item ${active ? "active" : ""}`}
                  onClick={() => onViewChange(item.id)}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  <small>
                    {item.id === "timeline" && trajectory.steps.length}
                    {item.id === "tools" && toolCount}
                    {item.id === "metrics" && trajectory.steps.filter((s) => s.metrics).length}
                    {item.id === "subagents" && trajectory.subagents.length}
                  </small>
                </button>
              );
            })}
          </nav>

          {trajectory.subagents.length > 0 && (
            <section className="sidebar-section">
              <div className="nav-label">
                子轨迹
                <span>{trajectory.subagents.length}</span>
              </div>
              <div className="subagent-list">
                {trajectory.subagents.map((subagent) => (
                  <button
                    type="button"
                    className="subagent-item"
                    key={subagent.id}
                    onClick={() => onOpenTrajectory(subagent)}
                  >
                    <span className="subagent-avatar">
                      {subagent.agent.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="subagent-info">
                      <strong>{subagent.title}</strong>
                      <small>
                        {subagent.steps.length} 步 · {subagent.metrics.toolCalls} 次调用
                      </small>
                    </span>
                    <ChevronDown size={14} className="subagent-arrow" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="sidebar-section">
            <div className="nav-label">
              文件
              <span>{bundle.trajectories.length}</span>
            </div>
            <button
              type="button"
              className={`file-item ${isDemo ? "selected" : ""}`}
              onClick={onDemo}
            >
              <span className="file-icon">
                <FileJson2 size={17} />
              </span>
              <span>
                <strong>{bundle.fileName}</strong>
                <small>{formatDateTime(bundle.importedAt)}</small>
              </span>
            </button>
          </section>
        </div>

        <div className="sidebar-footer">
          <div className="privacy-note">
            <Activity size={14} />
            <span>文件仅在本机浏览器解析</span>
          </div>
          <button type="button" className="sidebar-upload" onClick={onImport}>
            <Upload size={16} />
            打开另一份轨迹
          </button>
        </div>
      </aside>
    </>
  );
}
