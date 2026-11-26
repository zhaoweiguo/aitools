import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleEllipsis,
  Clock3,
  Code2,
  Copy,
  FileCode2,
  FileText,
  Search,
  Sparkles,
  Terminal,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  argumentValue,
  formatClock,
  formatCost,
  formatDateTime,
  formatDuration,
  formatNumber,
  timelineBounds,
} from "../lib/atif.js";

const SOURCE_META = {
  user: { label: "用户", icon: UserRound, tone: "blue" },
  agent: { label: "Agent", icon: Bot, tone: "mint" },
  system: { label: "系统", icon: CircleEllipsis, tone: "amber" },
};

const TOOL_ICONS = {
  bash: Terminal,
  shell: Terminal,
  terminal: Terminal,
  read: FileText,
  write: FileCode2,
  edit: FileCode2,
  apply_patch: FileCode2,
  task: Sparkles,
  search: Search,
  grep: Search,
  rg: Search,
};

function toolIcon(name) {
  const key = String(name || "").toLowerCase();
  if (key.includes("bash") || key.includes("shell")) return Terminal;
  if (key.includes("read") || key.includes("file")) return FileText;
  if (key.includes("write") || key.includes("edit") || key.includes("patch")) return FileCode2;
  if (key.includes("search") || key.includes("grep") || key === "rg") return Search;
  if (key.includes("task") || key.includes("agent")) return Sparkles;
  return Wrench;
}

function statusMeta(status, isError) {
  const normalized = String(status || "").toLowerCase();
  if (isError || ["error", "failed", "failure"].includes(normalized)) {
    return { label: "失败", icon: XCircle, tone: "danger" };
  }
  if (["pending", "running", "in_progress"].includes(normalized)) {
    return { label: "运行中", icon: Clock3, tone: "warning" };
  }
  if (normalized) return { label: normalized, icon: CheckCircle2, tone: "success" };
  return null;
}

function inlineCode(text, limit = 78) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function toolSummary(tool) {
  const args = tool.args || {};
  return (
    argumentValue(args, ["command", "cmd"]) ||
    argumentValue(args, ["filePath", "file_path", "path"]) ||
    argumentValue(args, ["query", "pattern"]) ||
    argumentValue(args, ["description", "prompt"]) ||
    inlineCode(JSON.stringify(args), 90) ||
    "无参数"
  );
}

function StepsRail({ steps, selectedStepId, onSelect }) {
  const ref = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (!activeRef.current || !ref.current) return;
    const rail = ref.current.getBoundingClientRect();
    const active = activeRef.current.getBoundingClientRect();
    if (active.top < rail.top || active.bottom > rail.bottom) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedStepId]);

  return (
    <div className="steps-rail-header">
      <div>
        <span className="eyebrow">STEPS</span>
        <span>{steps.length}</span>
      </div>
      <div className="rail-divider" />
      <div className="steps-rail" ref={ref}>
        {steps.map((step) => {
          const meta = SOURCE_META[step.source];
          return (
            <button
              ref={step.id === selectedStepId ? activeRef : null}
              type="button"
              key={step.id}
              className={`step-rail-item ${step.id === selectedStepId ? "active" : ""}`}
              onClick={() => onSelect(step.id)}
              title={`步骤 ${step.id} · ${meta.label}`}
            >
              <span className={`rail-dot ${meta.tone}`}>{step.id}</span>
              <span className="rail-copy">
                <strong>
                  {step.tools.length
                    ? step.tools.map((tool) => tool.name).join(", ")
                    : step.source === "user"
                      ? "用户消息"
                      : step.source === "system"
                        ? "系统事件"
                        : "Agent 回复"}
                </strong>
                <small>{formatClock(step.timestamp) || `Step ${step.id}`}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToolResult({ tool, onOpenSubagent }) {
  const result = tool.result;
  if (!result) {
    return <div className="observation-empty">尚无观察结果</div>;
  }
  const meta = statusMeta(result.status, result.isError);
  const includesSubagent = result.subagentRefs.length > 0;
  return (
    <div className={`tool-observation ${result.isError ? "error" : ""}`}>
      <div className="observation-header">
        <div>
          {meta && (
            <span className={`status-chip ${meta.tone}`}>
              <meta.icon size={12} />
              {meta.label}
            </span>
          )}
          {result.exitCode != null && <span className="exit-code">exit {result.exitCode}</span>}
          {result.truncated && <span className="status-chip warning">已截断</span>}
        </div>
        <div className="observation-timing">
          {result.startedAt && result.endedAt && (
            <span>
              {formatDuration(
                new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime(),
              )}
            </span>
          )}
          {result.content && (
            <button
              type="button"
              className="inline-icon-button"
              title="复制输出"
              onClick={() => navigator.clipboard?.writeText(result.content)}
            >
              <Copy size={13} />
            </button>
          )}
        </div>
      </div>
      {result.content && <pre className="observation-content">{result.content}</pre>}
      {includesSubagent && (
        <div className="subagent-result">
          <div className="subagent-result-heading">
            <Sparkles size={14} />
            子代理轨迹
          </div>
          {result.subagentRefs.map((ref, index) => (
            <button
              type="button"
              key={`${ref.trajectoryId || ref.trajectoryPath || index}`}
              className="subagent-result-link"
              onClick={() => onOpenSubagent(ref.trajectoryId)}
            >
              <span>{ref.extra?.label || ref.trajectoryId || "打开子轨迹"}</span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, onOpenSubagent }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = toolIcon(tool.name);
  const result = tool.result;
  const meta = result ? statusMeta(result.status, result.isError) : null;
  const subagentRef = result?.subagentRefs?.[0];
  return (
    <article className={`tool-card ${result?.isError ? "has-error" : ""}`}>
      <button
        type="button"
        className="tool-card-summary"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="tool-card-icon">
          <Icon size={16} />
        </span>
        <span className="tool-card-main">
          <span className="tool-card-title">
            <strong>{tool.name}</strong>
            {meta && (
              <span className={`mini-status ${meta.tone}`}>
                {meta.icon && <meta.icon size={11} />}
                {meta.label}
              </span>
            )}
            {subagentRef && (
              <span className="mini-status subagent">
                <Sparkles size={11} />
                子代理
              </span>
            )}
          </span>
          <code>{toolSummary(tool)}</code>
        </span>
        <ChevronDown size={16} className={`chevron ${expanded ? "rotated" : ""}`} />
      </button>
      {expanded && (
        <div className="tool-card-body">
          <div className="io-block">
            <div className="io-label">
              <Braces size={13} />
              参数
            </div>
            <pre className="json-view">{JSON.stringify(tool.args, null, 2)}</pre>
          </div>
          {result && (
            <div className="io-block">
              <div className="io-label">
                <Code2 size={13} />
                观察结果
              </div>
              <ToolResult tool={tool} onOpenSubagent={onOpenSubagent} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function SourceBadge({ source }) {
  const meta = SOURCE_META[source] || SOURCE_META.agent;
  const Icon = meta.icon;
  return (
    <span className={`source-badge ${meta.tone}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function StepCard({ step, isSelected, onSelect, onOpenSubagent }) {
  return (
    <article
      id={`step-${step.id}`}
      className={`timeline-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(step.id)}
    >
      <div className="timeline-node">
        <span className={`node-circle ${SOURCE_META[step.source].tone}`}>
          {step.source === "user" ? (
            <UserRound size={15} />
          ) : step.source === "system" ? (
            <CircleEllipsis size={15} />
          ) : (
            <Bot size={15} />
          )}
        </span>
      </div>
      <div className="card-shell">
        <div className="card-topline">
          <div className="card-identity">
            <span className="step-number">STEP {String(step.id).padStart(2, "0")}</span>
            <SourceBadge source={step.source} />
            {step.model && <span className="model-chip">{step.model}</span>}
            {step.reasoningEffort && (
              <span className="effort-chip">effort · {step.reasoningEffort}</span>
            )}
          </div>
          <div className="card-time">
            {step.timestamp ? formatClock(step.timestamp) : ""}
            {step.metrics?.cost_usd != null && (
              <span>{formatCost(step.metrics.cost_usd)}</span>
            )}
          </div>
        </div>

        {step.message ? (
          <div className="message-body">{step.message}</div>
        ) : (
          <div className="message-body muted-body">Agent 已发起工具调用</div>
        )}

        {step.tools.length > 0 && (
          <div className="tool-stack" onClick={(event) => event.stopPropagation()}>
            {step.tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onOpenSubagent={onOpenSubagent} />
            ))}
          </div>
        )}

        {step.reasoning && <ReasoningBlock reasoning={step.reasoning} />}

        <div className="card-footer">
          <div className="footer-metrics">
            {step.metrics?.prompt_tokens != null && (
              <span>
                <small>IN</small> {formatNumber(step.metrics.prompt_tokens)}
              </span>
            )}
            {step.metrics?.completion_tokens != null && (
              <span>
                <small>OUT</small> {formatNumber(step.metrics.completion_tokens)}
              </span>
            )}
            {step.metrics?.cached_tokens != null && (
              <span>
                <small>CACHE</small> {formatNumber(step.metrics.cached_tokens)}
              </span>
            )}
            {step.metrics?.extra?.latency_ms != null && (
              <span>
                <small>LAT</small> {formatDuration(step.metrics.extra.latency_ms)}
              </span>
            )}
          </div>
          {isSelected && <span className="selected-label">正在查看</span>}
        </div>
      </div>
    </article>
  );
}

function ReasoningBlock({ reasoning }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`reasoning-block ${open ? "open" : ""}`}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <Sparkles size={14} />
        <span>思考过程</span>
        <small>{open ? "收起" : `${reasoning.length} 字符`}</small>
        <ChevronDown size={14} className={open ? "rotated" : ""} />
      </button>
      {open && <div>{reasoning}</div>}
    </div>
  );
}

function Inspector({ step, trajectory, onOpenSubagent }) {
  if (!step) {
    return (
      <aside className="inspector">
        <div className="inspector-empty">选择一个步骤查看详情</div>
      </aside>
    );
  }
  const resultCount = step.tools.filter((tool) => tool.result).length;
  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div>
          <span className="eyebrow">STEP DETAIL</span>
          <h2>步骤 {String(step.id).padStart(2, "0")}</h2>
        </div>
        <SourceBadge source={step.source} />
      </div>
      <div className="inspector-scroll">
        <dl className="detail-list">
          <div>
            <dt>时间</dt>
            <dd>{formatDateTime(step.timestamp)}</dd>
          </div>
          <div>
            <dt>模型</dt>
            <dd>{step.model || "—"}</dd>
          </div>
          <div>
            <dt>思考强度</dt>
            <dd>{step.reasoningEffort ?? "—"}</dd>
          </div>
          <div>
            <dt>工具调用</dt>
            <dd>{step.tools.length}</dd>
          </div>
          <div>
            <dt>已返回</dt>
            <dd>{resultCount > 0 ? `${resultCount} / ${step.tools.length}` : "—"}</dd>
          </div>
          <div>
            <dt>LLM 调用</dt>
            <dd>{step.llmCallCount || "—"}</dd>
          </div>
        </dl>

        {step.metrics && (
          <>
            <div className="inspector-section-title">本步用量</div>
            <div className="mini-metrics-grid">
              <div>
                <span>Prompt</span>
                <strong>{formatNumber(step.metrics.prompt_tokens)}</strong>
              </div>
              <div>
                <span>Completion</span>
                <strong>{formatNumber(step.metrics.completion_tokens)}</strong>
              </div>
              <div>
                <span>Cached</span>
                <strong>{formatNumber(step.metrics.cached_tokens)}</strong>
              </div>
              <div>
                <span>Cost</span>
                <strong>{formatCost(step.metrics.cost_usd)}</strong>
              </div>
            </div>
          </>
        )}

        {step.tools.length > 0 && (
          <>
            <div className="inspector-section-title">工具状态</div>
            <div className="inspector-tools">
              {step.tools.map((tool) => {
                const status = statusMeta(tool.result?.status, tool.result?.isError);
                return (
                  <div className="inspector-tool-row" key={tool.id}>
                    <span className={`tool-dot ${status?.tone || ""}`} />
                    <div>
                      <strong>{tool.name}</strong>
                      <code>{inlineCode(toolSummary(tool), 42)}</code>
                    </div>
                    <span>{status?.label || "无结果"}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {trajectory.subagents.length > 0 && (
          <>
            <div className="inspector-section-title">相关轨迹</div>
            <button
              type="button"
              className="inspector-subagent"
              onClick={() => onOpenSubagent(trajectory.subagents[0].id)}
            >
              <span className="subagent-avatar">
                {trajectory.subagents[0].agent.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong>{trajectory.subagents[0].title}</strong>
                <small>{trajectory.subagents[0].steps.length} 个步骤</small>
              </span>
              <ChevronRight size={15} />
            </button>
          </>
        )}

        {step.extra && Object.keys(step.extra).length > 0 && (
          <>
            <div className="inspector-section-title">
              <AlertTriangle size={13} />
              元数据
            </div>
            <pre className="inspector-json">{JSON.stringify(step.extra, null, 2)}</pre>
          </>
        )}
      </div>
    </aside>
  );
}

export default function TimelineView({
  trajectory,
  query,
  selectedStepId,
  onSelectStep,
  onOpenSubagent,
}) {
  const [sourceFilter, setSourceFilter] = useState("all");
  const steps = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return trajectory.steps.filter((step) => {
      if (sourceFilter !== "all" && step.source !== sourceFilter) return false;
      if (!normalized) return true;
      return [
        step.id,
        step.message,
        step.reasoning,
        step.model,
        ...step.tools.flatMap((tool) => [
          tool.name,
          JSON.stringify(tool.args),
          tool.result?.content,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [trajectory, query, sourceFilter]);

  const selectedStep =
    trajectory.steps.find((step) => step.id === selectedStepId) || trajectory.steps[0];
  const bounds = timelineBounds(trajectory.steps);
  const counts = {
    all: trajectory.steps.length,
    user: trajectory.steps.filter((step) => step.source === "user").length,
    agent: trajectory.steps.filter((step) => step.source === "agent").length,
    system: trajectory.steps.filter((step) => step.source === "system").length,
  };

  return (
    <div className="timeline-layout">
      <section className="content-panel">
        <div className="context-strip">
          <div className="context-main">
            <span className="eyebrow">ACTIVE TRAJECTORY</span>
            <h2>{trajectory.title}</h2>
            <div className="context-meta">
              <span>{trajectory.agent.name}</span>
              <i />
              <span>{trajectory.agent.modelName || "未知模型"}</span>
              <i />
              <span>
                {formatDateTime(trajectory.firstTimestamp)} —{" "}
                {formatClock(trajectory.lastTimestamp)}
              </span>
            </div>
          </div>
          <div className="context-duration">
            <small>总耗时</small>
            <strong>{formatDuration(trajectory.durationMs)}</strong>
          </div>
        </div>

        <div className="timeline-toolbar">
          <div className="segmented-control" role="tablist" aria-label="步骤来源">
            {[
              ["all", "全部"],
              ["agent", "Agent"],
              ["user", "用户"],
              ["system", "系统"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={sourceFilter === value ? "active" : ""}
                onClick={() => setSourceFilter(value)}
              >
                {label}
                <span>{counts[value]}</span>
              </button>
            ))}
          </div>
          <div className="timeline-summary">
            {query ? (
              <>
                <Search size={14} />
                {steps.length} 个匹配步骤
              </>
            ) : (
              <>
                <Clock3 size={14} />
                {trajectory.steps.length} 个步骤
              </>
            )}
          </div>
        </div>

        {bounds && trajectory.steps.length > 1 && (
          <div className="timeline-scale" aria-hidden="true">
            <span>{formatClock(bounds.start)}</span>
            <div className="scale-line">
              {trajectory.steps.map((step) => (
                <button
                  type="button"
                  key={step.id}
                  style={{
                    left: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((new Date(step.timestamp).getTime() - bounds.start) / bounds.range) * 100,
                      ),
                    )}%`,
                  }}
                  className={`scale-tick ${SOURCE_META[step.source].tone} ${
                    step.id === selectedStepId ? "active" : ""
                  }`}
                  onClick={() => onSelectStep(step.id)}
                  title={`步骤 ${step.id}`}
                />
              ))}
            </div>
            <span>{formatClock(bounds.end)}</span>
          </div>
        )}

        {steps.length ? (
          <div className="timeline-list">
            {steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                isSelected={step.id === selectedStepId}
                onSelect={onSelectStep}
                onOpenSubagent={onOpenSubagent}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={24} />
            <h3>没有匹配的步骤</h3>
            <p>调整搜索词或切换来源筛选。</p>
          </div>
        )}
      </section>

      <aside className="right-rail">
        <StepsRail
          steps={trajectory.steps}
          selectedStepId={selectedStepId}
          onSelect={onSelectStep}
        />
        <Inspector
          step={selectedStep}
          trajectory={trajectory}
          onOpenSubagent={onOpenSubagent}
        />
      </aside>
    </div>
  );
}
