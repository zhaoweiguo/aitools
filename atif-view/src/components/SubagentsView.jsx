import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  GitBranch,
  Search,
  Sparkles,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import {
  formatCost,
  formatDuration,
  formatNumber,
} from "../lib/atif.js";

function SubagentCard({ trajectory, onOpen }) {
  const completedTools = trajectory.steps.reduce(
    (count, step) =>
      count + step.tools.filter((tool) => tool.result && !tool.result.isError).length,
    0,
  );
  const failedTools = trajectory.steps.reduce(
    (count, step) => count + step.tools.filter((tool) => tool.result?.isError).length,
    0,
  );
  return (
    <article className="subagent-card">
      <div className="subagent-card-head">
        <div className="agent-avatar large">
          {trajectory.agent.name.slice(0, 2).toUpperCase()}
          <span className="agent-live-dot" />
        </div>
        <div className="subagent-card-title">
          <span className="eyebrow">SUBAGENT</span>
          <h3>{trajectory.title}</h3>
          <p>
            {trajectory.agent.name} <span>·</span> {trajectory.agent.modelName || "未知模型"}
          </p>
        </div>
        <button type="button" className="secondary-button compact" onClick={() => onOpen(trajectory)}>
          打开完整轨迹
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="subagent-stat-row">
        <div><small>步骤</small><strong>{trajectory.steps.length}</strong></div>
        <div><small>工具调用</small><strong>{trajectory.metrics.toolCalls}</strong></div>
        <div><small>Token</small><strong>{formatNumber(trajectory.metrics.promptTokens + trajectory.metrics.completionTokens)}</strong></div>
        <div><small>耗时</small><strong>{formatDuration(trajectory.durationMs)}</strong></div>
        <div><small>成本</small><strong>{formatCost(trajectory.metrics.costUsd)}</strong></div>
      </div>

      <div className="subagent-card-body">
        <div className="mini-timeline">
          {trajectory.steps.map((step) => (
            <div className={`mini-timeline-step ${step.source}`} key={step.id}>
              <span className="mini-step-marker">
                {step.source === "user" ? <UserRound size={12} /> : <Bot size={12} />}
              </span>
              <div>
                <span>STEP {String(step.id).padStart(2, "0")}</span>
                <p>{step.message || step.reasoning || (step.tools.length ? step.tools.map((tool) => tool.name).join(", ") : "空步骤")}</p>
              </div>
              {step.tools.length > 0 && (
                <small className="mini-tool-count">
                  <Wrench size={11} />
                  {step.tools.length}
                </small>
              )}
            </div>
          ))}
        </div>

        <div className="subagent-side">
          <div className="subagent-health">
            <span className="health-ring">
              <CheckCircle2 size={19} />
            </span>
            <div>
              <strong>
                {failedTools ? `${failedTools} 个工具错误` : "执行完成"}
              </strong>
              <small>{completedTools} 次工具调用成功</small>
            </div>
          </div>
          <div className="subagent-meta-list">
            <div><GitBranch size={13} /><span>Trajectory</span><code>{trajectory.id}</code></div>
            <div><CircleDot size={13} /><span>Schema</span><code>{trajectory.schemaVersion}</code></div>
            {trajectory.sessionId && <div><ExternalLink size={13} /><span>Session</span><code>{trajectory.sessionId}</code></div>}
          </div>
          {trajectory.notes && <p className="subagent-notes">{trajectory.notes}</p>}
        </div>
      </div>

      <div className="subagent-card-foot">
        <span>
          <Sparkles size={13} />
          独立上下文 · {trajectory.metrics.agentSteps} 次 Agent 推理
        </span>
        <button type="button" onClick={() => onOpen(trajectory)}>
          查看完整步骤
          <ChevronRight size={14} />
        </button>
      </div>
    </article>
  );
}

function DelegationSource({ trajectory, onOpenSubagent }) {
  const delegations = trajectory.steps.flatMap((step) =>
    step.tools
      .filter((tool) => tool.result?.subagentRefs?.length)
      .map((tool) => ({
        step,
        tool,
        refs: tool.result.subagentRefs,
      })),
  );
  if (!delegations.length) return null;
  return (
    <div className="delegation-list">
      {delegations.map(({ step, tool, refs }) => (
        <button
          type="button"
          className="delegation-row"
          key={tool.id}
          onClick={() => {
            const sub = trajectory.subagents.find(
              (item) => item.id === refs[0]?.trajectoryId,
            );
            if (sub) onOpenSubagent(sub);
          }}
        >
          <span className="delegation-step">STEP {String(step.id).padStart(2, "0")}</span>
          <span className="delegation-line"><i /></span>
          <span className="delegation-icon"><GitBranch size={15} /></span>
          <span>
            <strong>{tool.name}</strong>
            <small>{refs.map((ref) => ref.extra?.label || ref.trajectoryId).join(", ")}</small>
          </span>
          <ChevronRight size={15} />
        </button>
      ))}
    </div>
  );
}

export default function SubagentsView({ trajectory, query, onOpenSubagent }) {
  const normalized = query.trim().toLowerCase();
  const subagents = useMemo(
    () =>
      trajectory.subagents.filter((subagent) => {
        if (!normalized) return true;
        return [
          subagent.title,
          subagent.agent.name,
          subagent.agent.modelName,
          subagent.notes,
          ...subagent.steps.map((step) => `${step.message} ${step.reasoning}`),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      }),
    [trajectory, normalized],
  );

  if (!trajectory.subagents.length) {
    return (
      <div className="single-view">
        <section className="empty-feature">
          <div className="empty-feature-graphic">
            <span><Bot size={23} /></span>
            <i />
            <span className="primary"><Sparkles size={25} /></span>
          </div>
          <span className="eyebrow">SUBAGENTS</span>
          <h2>这份轨迹中没有子代理</h2>
          <p>
            ATIF 可在主轨迹中以 <code>subagent_trajectories</code> 嵌入子代理，
            或用 <code>subagent_trajectory_ref</code> 建立引用。当前文档只包含一个执行上下文。
          </p>
          <div className="empty-feature-meta">
            <span><CheckCircle2 size={14} />主轨迹可用</span>
            <span><Clock3 size={14} />{trajectory.steps.length} 个步骤已加载</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="single-view subagents-view">
      <section className="subagents-intro">
        <div>
          <span className="eyebrow">DELEGATION MAP</span>
          <h2>子代理与执行上下文</h2>
          <p>每个子轨迹拥有独立的步骤、工具调用与指标，可单独下钻查看。</p>
        </div>
        <div className="subagent-origin">
          <span className="agent-avatar">{trajectory.agent.name.slice(0, 2).toUpperCase()}</span>
          <div>
            <small>父级 Agent</small>
            <strong>{trajectory.agent.name}</strong>
          </div>
          <span className="origin-count">{trajectory.subagents.length} 个子轨迹</span>
        </div>
      </section>

      <div className="delegation-map">
        <div className="delegation-map-head">
          <div><GitBranch size={15} /><span>委派来源</span></div>
          <div><Sparkles size={15} /><span>子代理</span></div>
        </div>
        <div className="delegation-map-grid">
          <div className="delegation-source-panel">
            <div className="source-run-title">
              <span className="run-status-dot" />
              <div>
                <strong>{trajectory.title}</strong>
                <small>{trajectory.steps.length} steps · {trajectory.metrics.toolCalls} tools</small>
              </div>
            </div>
            <DelegationSource trajectory={trajectory} onOpenSubagent={onOpenSubagent} />
          </div>
          <div className="delegation-arrow"><ArrowRight size={19} /></div>
          <div className="delegation-targets">
            {trajectory.subagents.map((subagent) => (
              <button
                type="button"
                key={subagent.id}
                className="delegation-target"
                onClick={() => onOpenSubagent(subagent)}
              >
                <span className="agent-avatar small">{subagent.agent.name.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{subagent.title}</strong>
                  <small>{subagent.steps.length} steps · {subagent.metrics.toolCalls} tools</small>
                </span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-heading-row">
        <div>
          <span className="eyebrow">AGENT DETAILS</span>
          <h2>执行详情</h2>
        </div>
        <span>{subagents.length} 个子代理</span>
      </div>

      {subagents.length ? (
        <div className="subagent-cards">
          {subagents.map((subagent) => (
            <SubagentCard
              key={subagent.id}
              trajectory={subagent}
              onOpen={onOpenSubagent}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={24} />
          <h3>没有匹配的子代理</h3>
          <p>换一个搜索词试试。</p>
        </div>
      )}
    </div>
  );
}
