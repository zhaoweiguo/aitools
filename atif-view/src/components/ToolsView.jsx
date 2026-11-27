import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Copy,
  Filter,
  Search,
  Sparkles,
  Terminal,
  Timer,
  Wrench,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  allToolCalls,
  argumentValue,
  formatDuration,
  formatNumber,
} from "../lib/atif.js";

function toolIcon(name) {
  const key = String(name || "").toLowerCase();
  if (key.includes("bash") || key.includes("shell")) return Terminal;
  if (key.includes("task") || key.includes("agent")) return Sparkles;
  return Wrench;
}

function summary(tool) {
  return (
    argumentValue(tool.args, ["command", "filePath", "file_path", "path", "query", "description"]) ||
    JSON.stringify(tool.args)
  );
}

function duration(tool) {
  const started = new Date(tool.result?.startedAt).getTime();
  const ended = new Date(tool.result?.endedAt).getTime();
  return Number.isFinite(started) && Number.isFinite(ended) && ended > started
    ? ended - started
    : 0;
}

function CallDetail({ call, onOpenStep, onOpenSubagent }) {
  const result = call.result;
  const isError = result?.isError;
  return (
    <div className="call-detail">
      <div className="call-detail-section">
        <div className="detail-section-label">
          <span>参数</span>
          <button
            type="button"
            title="复制参数"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(call.args, null, 2))}
          >
            <Copy size={13} />
          </button>
        </div>
        <pre>{JSON.stringify(call.args, null, 2)}</pre>
      </div>
      <div className="call-detail-section">
        <div className="detail-section-label">
          <span className={isError ? "danger-text" : ""}>
            {isError ? "错误输出" : "观察结果"}
          </span>
          {result?.content && (
            <button
              type="button"
              title="复制输出"
              onClick={() => navigator.clipboard?.writeText(result.content)}
            >
              <Copy size={13} />
            </button>
          )}
        </div>
        {result?.content ? (
          <pre className={isError ? "error-output" : ""}>{result.content}</pre>
        ) : (
          <div className="empty-output">没有观察到输出</div>
        )}
      </div>
      <div className="call-detail-actions">
        <button type="button" onClick={() => onOpenStep(call.stepId)}>
          在时间线中查看步骤 {call.stepId}
          <ArrowUpRight size={14} />
        </button>
        {result?.subagentRefs?.map((ref, index) => (
          <button
            type="button"
            key={`${ref.trajectoryId}-${index}`}
            onClick={() => onOpenSubagent(ref.trajectoryId)}
          >
            打开子代理
            <Sparkles size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ToolsView({ trajectory, query, onOpenStep, onOpenSubagent }) {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const calls = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allToolCalls(trajectory).filter((call) => {
      if (filter === "success" && (call.result?.isError || !call.result)) return false;
      if (filter === "error" && !call.result?.isError) return false;
      if (filter === "pending" && call.result) return false;
      if (!normalized) return true;
      return [
        call.name,
        call.id,
        JSON.stringify(call.args),
        call.result?.content,
        call.step.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [trajectory, query, filter]);

  const all = allToolCalls(trajectory);
  const successCount = all.filter((call) => call.result && !call.result.isError).length;
  const errorCount = all.filter((call) => call.result?.isError).length;
  const pendingCount = all.filter((call) => !call.result).length;
  const toolGroups = Object.entries(
    all.reduce((groups, call) => {
      groups[call.name] = (groups[call.name] || 0) + 1;
      return groups;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const totalDuration = all.reduce((total, call) => total + duration(call), 0);

  return (
    <div className="single-view">
      <section className="summary-grid tools-summary">
        <div className="summary-card">
          <span className="summary-icon mint">
            <Wrench size={18} />
          </span>
          <div>
            <small>工具调用</small>
            <strong>{all.length}</strong>
          </div>
          <span className="summary-foot">{toolGroups.length} 种工具</span>
        </div>
        <div className="summary-card">
          <span className="summary-icon success">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <small>成功</small>
            <strong>{successCount}</strong>
          </div>
          <span className="summary-foot">
            {all.length ? `${Math.round((successCount / all.length) * 100)}% 成功率` : "—"}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-icon danger">
            <XCircle size={18} />
          </span>
          <div>
            <small>失败 / 等待</small>
            <strong>
              {errorCount}
              <em> / {pendingCount}</em>
            </strong>
          </div>
          <span className="summary-foot">需要关注的调用</span>
        </div>
        <div className="summary-card">
          <span className="summary-icon amber">
            <Timer size={18} />
          </span>
          <div>
            <small>工具耗时</small>
            <strong>{formatDuration(totalDuration)}</strong>
          </div>
          <span className="summary-foot">可观测结果合计</span>
        </div>
      </section>

      <div className="view-columns">
        <section className="content-panel tools-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">INVOCATIONS</span>
              <h2>调用记录</h2>
            </div>
            <div className="segmented-control compact">
              {[
                ["all", "全部", all.length],
                ["success", "成功", successCount],
                ["error", "失败", errorCount],
                ["pending", "等待", pendingCount],
              ].map(([value, label, count]) => (
                <button
                  type="button"
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {calls.length ? (
            <div className="calls-table">
              <div className="calls-table-head">
                <span>调用 / 参数</span>
                <span>步骤</span>
                <span>耗时</span>
                <span>状态</span>
                <span />
              </div>
              {calls.map((call, index) => {
                const Icon = toolIcon(call.name);
                const open = expandedId === call.id;
                const isError = call.result?.isError;
                return (
                  <div className={`call-row-group ${open ? "open" : ""}`} key={`${call.id}-${index}`}>
                    <button
                      type="button"
                      className="call-row"
                      onClick={() => setExpandedId(open ? null : call.id)}
                      aria-expanded={open}
                    >
                      <span className="call-main">
                        <span className={`call-icon ${isError ? "error" : ""}`}>
                          <Icon size={16} />
                        </span>
                        <span>
                          <strong>{call.name}</strong>
                          <code>{summary(call)}</code>
                        </span>
                      </span>
                      <span className="call-step">STEP {String(call.stepId).padStart(2, "0")}</span>
                      <span className="call-duration">{duration(call) ? formatDuration(duration(call)) : "—"}</span>
                      <span>
                        {isError ? (
                          <span className="status-chip danger">
                            <XCircle size={12} />失败
                          </span>
                        ) : call.result ? (
                          <span className="status-chip success">
                            <CheckCircle2 size={12} />成功
                          </span>
                        ) : (
                          <span className="status-chip warning">等待</span>
                        )}
                      </span>
                      <ChevronDown size={16} className={open ? "rotated" : ""} />
                    </button>
                    {open && (
                      <CallDetail
                        call={call}
                        onOpenStep={onOpenStep}
                        onOpenSubagent={onOpenSubagent}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={24} />
              <h3>没有匹配的工具调用</h3>
              <p>调整搜索或状态筛选。</p>
            </div>
          )}
        </section>

        <aside className="side-panel">
          <div className="side-panel-heading">
            <div>
              <span className="eyebrow">TOOL MIX</span>
              <h2>工具分布</h2>
            </div>
            <Filter size={16} />
          </div>
          <div className="tool-mix">
            {toolGroups.map(([name, count]) => {
              const Icon = toolIcon(name);
              const width = all.length ? Math.max(4, (count / all.length) * 100) : 0;
              return (
                <div className="tool-mix-row" key={name}>
                  <div>
                    <span className="tool-mix-icon">
                      <Icon size={14} />
                    </span>
                    <strong>{name}</strong>
                    <span>{count}</span>
                  </div>
                  <div className="tool-mix-track">
                    <span style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {errorCount > 0 && (
            <div className="attention-card">
              <AlertTriangle size={16} />
              <div>
                <strong>{errorCount} 个调用返回错误</strong>
                <p>切换“失败”筛选即可查看完整错误输出。</p>
              </div>
            </div>
          )}
          <div className="agent-footnote">
            <Bot size={15} />
            <span>
              关联自 <strong>{trajectory.agent.name}</strong>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
