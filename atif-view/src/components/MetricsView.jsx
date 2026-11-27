import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Clock3,
  Coins,
  Database,
  Gauge,
  Layers3,
  Search,
  Sparkles,
  Timer,
  UserRound,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatCost,
  formatDuration,
  formatNumber,
} from "../lib/atif.js";

const BLUE = "#6ca8ff";
const MINT = "#69ddb8";
const AMBER = "#f1bb67";
const RED = "#f07f86";
const MUTED = "#718096";

function TokenDonut({ cached, uncached, size = 174, stroke = 16 }) {
  const total = cached + uncached;
  const ratio = total ? cached / total : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`缓存占比 ${Math.round(ratio * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#222c36" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={MINT}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${ratio * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="donut-center">
        <strong>{Math.round(ratio * 100)}%</strong>
        <span>缓存命中</span>
      </div>
    </div>
  );
}

function Sparkline({ points, color = BLUE, fill = true }) {
  const width = 500;
  const height = 128;
  const pad = 8;
  if (points.length < 2) {
    return <div className="sparkline-placeholder">步骤用量不足，无法绘制趋势</div>;
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const coords = points.map((value, index) => {
    const x = pad + (index / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const gradientId = `spark-${color.replace("#", "")}`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="每步 token 趋势">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#26313b" strokeDasharray="3 6" />
      <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="#26313b" strokeDasharray="3 6" />
      {fill && <polygon points={area} fill={`url(#${gradientId})`} />}
      <polyline points={line} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="3" fill="#111820" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

function HBarChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="hbar-chart">
      {data.map((item) => (
        <div className="hbar-row" key={item.label}>
          <span className="hbar-label">{item.label}</span>
          <div className="hbar-track">
            <span style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, background: item.color }} />
          </div>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function SourceBreakdown({ trajectory }) {
  const sources = [
    {
      key: "agent",
      label: "Agent",
      icon: Bot,
      color: MINT,
      value: trajectory.metrics.agentSteps,
    },
    {
      key: "user",
      label: "用户",
      icon: UserRound,
      color: BLUE,
      value: trajectory.metrics.userSteps,
    },
    {
      key: "system",
      label: "系统",
      icon: Activity,
      color: AMBER,
      value: trajectory.metrics.systemSteps,
    },
  ];
  const total = Math.max(
    sources.reduce((sum, item) => sum + item.value, 0),
    trajectory.steps.length,
    1,
  );
  return (
    <div className="source-breakdown">
      <div className="stacked-track">
        {sources.map((source) => (
          <span
            key={source.key}
            style={{
              width: `${(source.value / total) * 100}%`,
              background: source.color,
            }}
            title={`${source.label} ${source.value}`}
          />
        ))}
      </div>
      <div className="source-legend">
        {sources.map((source) => (
          <div key={source.key}>
            <span style={{ background: source.color }} />
            <source.icon size={14} />
            <small>{source.label}</small>
            <strong>{source.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MetricsView({ trajectory, query, onOpenStep }) {
  const [metricTab, setMetricTab] = useState("prompt");
  const normalized = query.trim().toLowerCase();
  const steps = useMemo(
    () =>
      trajectory.steps.filter((step) => {
        if (!normalized) return true;
        return `${step.id} ${step.model} ${step.message} ${step.source}`
          .toLowerCase()
          .includes(normalized);
      }),
    [trajectory, normalized],
  );
  const promptValues = trajectory.steps
    .filter((step) => step.metrics)
    .map((step) => step.metrics.prompt_tokens || 0);
  const completionValues = trajectory.steps
    .filter((step) => step.metrics)
    .map((step) => step.metrics.completion_tokens || 0);
  const totalTokens = trajectory.metrics.promptTokens + trajectory.metrics.completionTokens;
  const cacheRatio = trajectory.metrics.promptTokens
    ? trajectory.metrics.cachedTokens / trajectory.metrics.promptTokens
    : 0;
  const avgLatencyValues = trajectory.steps
    .map((step) => step.metrics?.extra?.latency_ms)
    .filter((value) => Number.isFinite(Number(value)));
  const avgLatency = avgLatencyValues.length
    ? avgLatencyValues.reduce((sum, value) => sum + Number(value), 0) / avgLatencyValues.length
    : 0;
  const peakStep = [...trajectory.steps]
    .filter((step) => step.metrics)
    .sort(
      (a, b) =>
        (b.metrics.prompt_tokens || 0) +
        (b.metrics.completion_tokens || 0) -
        (a.metrics.prompt_tokens || 0) -
        (a.metrics.completion_tokens || 0),
    )[0];
  const toolCalls = trajectory.metrics.toolCalls;
  const toolStepCount = trajectory.steps.filter((step) => step.tools.length).length;

  const modelGroups = trajectory.steps.reduce((groups, step) => {
    if (!step.metrics || !step.model) return groups;
    const current = groups[step.model] || { prompt: 0, completion: 0, cached: 0, cost: 0 };
    current.prompt += step.metrics.prompt_tokens || 0;
    current.completion += step.metrics.completion_tokens || 0;
    current.cached += step.metrics.cached_tokens || 0;
    current.cost += step.metrics.cost_usd || 0;
    groups[step.model] = current;
    return groups;
  }, {});
  const modelData = Object.entries(modelGroups).map(([label, value], index) => ({
    label,
    value: value.prompt + value.completion,
    color: [MINT, BLUE, AMBER, RED][index % 4],
  }));

  return (
    <div className="single-view metrics-view">
      <section className="metrics-hero">
        <div className="metrics-hero-main">
          <div>
            <span className="eyebrow">RUN SUMMARY</span>
            <h2>{trajectory.title}</h2>
            <p>
              {trajectory.agent.modelName || "未知模型"} · {trajectory.steps.length} 个步骤 ·{" "}
              {formatDuration(trajectory.durationMs)} 总耗时
            </p>
          </div>
          <div className="hero-total">
            <small>总 Token</small>
            <strong>{formatNumber(totalTokens)}</strong>
            <span>{formatNumber(trajectory.metrics.promptTokens)} 输入 · {formatNumber(trajectory.metrics.completionTokens)} 输出</span>
          </div>
        </div>
        <div className="metrics-kpi-row">
          <div>
            <span className="kpi-icon mint"><Database size={16} /></span>
            <div><small>Prompt</small><strong>{formatNumber(trajectory.metrics.promptTokens)}</strong></div>
          </div>
          <div>
            <span className="kpi-icon blue"><Layers3 size={16} /></span>
            <div><small>Completion</small><strong>{formatNumber(trajectory.metrics.completionTokens)}</strong></div>
          </div>
          <div>
            <span className="kpi-icon amber"><Coins size={16} /></span>
            <div><small>总成本</small><strong>{formatCost(trajectory.metrics.costUsd)}</strong></div>
          </div>
          <div>
            <span className="kpi-icon violet"><Timer size={16} /></span>
            <div><small>平均延迟</small><strong>{formatDuration(avgLatency)}</strong></div>
          </div>
          <div>
            <span className="kpi-icon red"><Wrench size={16} /></span>
            <div><small>工具调用</small><strong>{formatNumber(toolCalls)}</strong></div>
          </div>
        </div>
      </section>

      <div className="metric-grid">
        <section className="chart-panel chart-panel-wide">
          <div className="chart-header">
            <div>
              <span className="eyebrow">TOKEN TREND</span>
              <h3>每步 Token 走势</h3>
            </div>
            <div className="segmented-control compact">
              <button
                type="button"
                className={metricTab === "prompt" ? "active" : ""}
                onClick={() => setMetricTab("prompt")}
              >
                输入
              </button>
              <button
                type="button"
                className={metricTab === "completion" ? "active" : ""}
                onClick={() => setMetricTab("completion")}
              >
                输出
              </button>
            </div>
          </div>
          <Sparkline
            points={metricTab === "prompt" ? promptValues : completionValues}
            color={metricTab === "prompt" ? BLUE : MINT}
          />
          <div className="chart-axis">
            <span>STEP 01</span>
            <span>STEP {String(Math.ceil(trajectory.steps.length / 2)).padStart(2, "0")}</span>
            <span>STEP {String(trajectory.steps.length).padStart(2, "0")}</span>
          </div>
        </section>

        <section className="chart-panel cache-panel">
          <div className="chart-header">
            <div>
              <span className="eyebrow">CACHE</span>
              <h3>Prompt 缓存</h3>
            </div>
            <Gauge size={17} />
          </div>
          <div className="cache-visual">
            <TokenDonut
              cached={trajectory.metrics.cachedTokens}
              uncached={Math.max(
                0,
                trajectory.metrics.promptTokens - trajectory.metrics.cachedTokens,
              )}
            />
            <div className="cache-legend">
              <div>
                <span className="legend-dot mint" />
                <small>缓存命中</small>
                <strong>{formatNumber(trajectory.metrics.cachedTokens)}</strong>
              </div>
              <div>
                <span className="legend-dot muted" />
                <small>未缓存</small>
                <strong>
                  {formatNumber(
                    Math.max(0, trajectory.metrics.promptTokens - trajectory.metrics.cachedTokens),
                  )}
                </strong>
              </div>
            </div>
          </div>
          <p className="chart-note">
            {cacheRatio >= 0.5
              ? "缓存命中良好，输入 token 的重复成本较低。"
              : "缓存占比较低；长前缀复用可能仍有优化空间。"}
          </p>
        </section>

        <section className="chart-panel">
          <div className="chart-header">
            <div>
              <span className="eyebrow">STEP MIX</span>
              <h3>步骤来源</h3>
            </div>
            <BarChart3 size={17} />
          </div>
          <SourceBreakdown trajectory={trajectory} />
          <div className="micro-stat-list">
            <div><span>包含工具的步骤</span><strong>{toolStepCount} / {trajectory.steps.length}</strong></div>
            <div><span>平均输入 / 步</span><strong>{formatNumber(trajectory.metrics.promptTokens / Math.max(trajectory.metrics.agentSteps, 1))}</strong></div>
            <div><span>子代理轨迹</span><strong>{trajectory.subagents.length}</strong></div>
          </div>
        </section>

        <section className="chart-panel">
          <div className="chart-header">
            <div>
              <span className="eyebrow">MODEL USAGE</span>
              <h3>模型分布</h3>
            </div>
            <Bot size={17} />
          </div>
          {modelData.length ? (
            <HBarChart data={modelData} />
          ) : (
            <div className="empty-output">轨迹中没有模型用量数据</div>
          )}
        </section>

        <section className="chart-panel chart-panel-wide step-metrics-panel">
          <div className="chart-header">
            <div>
              <span className="eyebrow">STEP METRICS</span>
              <h3>步骤用量明细</h3>
            </div>
            {peakStep && (
              <button type="button" className="text-button" onClick={() => onOpenStep(peakStep.id)}>
                峰值步骤 {peakStep.id}
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
          {steps.length ? (
            <div className="step-metrics-table">
              <div className="step-metrics-head">
                <span>步骤</span><span>来源</span><span>输入</span><span>输出</span><span>缓存</span><span>成本</span><span>延迟</span>
              </div>
              {steps.map((step) => (
                <button
                  type="button"
                  className="step-metrics-row"
                  key={step.id}
                  onClick={() => onOpenStep(step.id)}
                >
                  <span><strong>STEP {String(step.id).padStart(2, "0")}</strong><small>{step.model || "—"}</small></span>
                  <span className={`source-text ${step.source}`}>{step.source}</span>
                  <span>{formatNumber(step.metrics?.prompt_tokens)}</span>
                  <span>{formatNumber(step.metrics?.completion_tokens)}</span>
                  <span>{formatNumber(step.metrics?.cached_tokens)}</span>
                  <span>{formatCost(step.metrics?.cost_usd)}</span>
                  <span>{step.metrics?.extra?.latency_ms ? formatDuration(step.metrics.extra.latency_ms) : "—"}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state small">
              <Search size={21} />
              <h3>没有匹配的步骤</h3>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
