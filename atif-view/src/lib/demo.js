const subagent = {
  schema_version: "ATIF-v1.8",
  session_id: "ses_demo_payments",
  trajectory_id: "traj_demo_reviewer",
  agent: {
    name: "code-reviewer",
    version: "1.4.2",
    model_name: "claude-sonnet-4",
    extra: { role: "child", provider: "anthropic" },
  },
  notes:
    "子代理独立检查了支付回调的幂等性、签名校验与错误恢复路径，未修改主工作区。",
  extra: {
    session_title: "审查支付回调实现",
    agent_steps: 2,
    user_steps: 1,
    tool_calls: 2,
  },
  final_metrics: {
    total_prompt_tokens: 6840,
    total_completion_tokens: 1215,
    total_cached_tokens: 4096,
    total_cost_usd: 0.0281,
    total_steps: 4,
  },
  steps: [
    {
      step_id: 1,
      timestamp: "2026-11-26T14:05:11.000Z",
      source: "user",
      message: "审查刚写入的 webhook handler，重点看幂等和签名验证。",
    },
    {
      step_id: 2,
      timestamp: "2026-11-26T14:05:13.000Z",
      source: "agent",
      model_name: "claude-sonnet-4",
      reasoning_effort: "high",
      llm_call_count: 1,
      message: "我会先定位 handler 和已有测试，再沿着异常路径检查。",
      reasoning_content:
        "需要确认三个点：事件 ID 是否在写入副作用之前落库、签名字符串是否使用原始 body、失败后是否允许安全重试。",
      tool_calls: [
        {
          tool_call_id: "review-read",
          function_name: "read",
          arguments: { filePath: "src/webhooks/payment.ts" },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "review-read",
            content:
              "export async function handlePayment(req, res) {\n  const event = verifySignature(req.body, req.headers['stripe-signature'])\n  const existing = await db.paymentEvent.findUnique({ where: { id: event.id } })\n  if (existing) return res.json({ ok: true })\n  await processEvent(event)\n  await db.paymentEvent.create({ data: { id: event.id } })\n  return res.json({ ok: true })\n}",
            extra: { status: "completed", title: "payment.ts", exit_code: 0 },
          },
        ],
      },
      metrics: {
        prompt_tokens: 4280,
        completion_tokens: 720,
        cached_tokens: 3072,
        cost_usd: 0.0176,
        extra: { latency_ms: 6130 },
      },
    },
    {
      step_id: 3,
      timestamp: "2026-11-26T14:05:20.000Z",
      source: "agent",
      model_name: "claude-sonnet-4",
      reasoning_effort: "high",
      llm_call_count: 1,
      message: "发现一个关键的竞态窗口，我检查测试是否覆盖重复投递。",
      reasoning_content:
        "先把事件标记为处理中，再执行副作用；如果处理失败则删除标记。当前是先处理再创建记录，并发重复投递会重复执行。",
      tool_calls: [
        {
          tool_call_id: "review-test",
          function_name: "bash",
          arguments: { command: "rg -n \"duplicate|idempot\" tests/webhooks" },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "review-test",
            content:
              "tests/webhooks/payment.test.ts:42:  it('deduplicates completed events', ...)\n\ntests/webhooks/payment.test.ts:66:  it('accepts retry after transient failure', ...)",
            extra: { status: "completed", title: "rg · 2 matches", exit_code: 0 },
          },
        ],
      },
      metrics: {
        prompt_tokens: 2560,
        completion_tokens: 495,
        cached_tokens: 1024,
        cost_usd: 0.0105,
        extra: { latency_ms: 4880 },
      },
    },
    {
      step_id: 4,
      timestamp: "2026-11-26T14:05:26.000Z",
      source: "agent",
      model_name: "claude-sonnet-4",
      reasoning_effort: "high",
      llm_call_count: 1,
      message:
        "结论：把幂等键的占位写入移到副作用之前，并补充并发重复投递测试。签名应针对 raw body，不应使用已经解析的对象。",
      metrics: {
        prompt_tokens: 3200,
        completion_tokens: 380,
        cached_tokens: 2048,
        cost_usd: 0.0092,
        extra: { latency_ms: 3510 },
      },
    },
  ],
};

const demo = {
  schema_version: "ATIF-v1.8",
  session_id: "ses_7f82a143",
  trajectory_id: "traj_7f82a143",
  agent: {
    name: "tianxicode",
    version: "2.8.0",
    model_name: "gpt-5-codex",
    extra: { provider: "openai", mode: "build", variant: "high" },
  },
  notes:
    "升级支付模块的 webhook 处理：加入幂等保护、签名校验和失败重试，并通过集成测试验证。",
  extra: {
    session_title: "修复支付回调的并发幂等与签名校验",
    project_directory: "D:/2proj/payments-api",
    project_id: "prj_pay_042",
    session_created_at: "2026-11-26T14:02:03.000Z",
    session_updated_at: "2026-11-26T14:08:36.000Z",
    exported_at: "2026-11-26T14:09:02.000Z",
    source_format: "tianxicode-session-store",
    agent_steps: 8,
    user_steps: 1,
    system_steps: 1,
    tool_calls: 9,
  },
  final_metrics: {
    total_prompt_tokens: 48720,
    total_completion_tokens: 7860,
    total_cached_tokens: 28672,
    total_cost_usd: 0.1824,
    total_steps: 10,
    extra: {
      agent_steps: 8,
      user_steps: 1,
      system_steps: 1,
      tool_calls: 9,
    },
  },
  steps: [
    {
      step_id: 1,
      timestamp: "2026-11-26T14:02:03.000Z",
      source: "user",
      message:
        "支付回调偶发重复扣款。请检查 webhook 流程，修复幂等和签名校验，并跑完整测试。",
      extra: { message_id: "msg_user_01" },
    },
    {
      step_id: 2,
      timestamp: "2026-11-26T14:02:06.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message: "我先定位 webhook 入口、事件表和现有测试，确认重复扣款发生在哪一段。",
      reasoning_content:
        "这是一个需要先观察再修改的问题。优先检查回调签名是否在解析 JSON 之前完成，以及幂等记录和业务副作用的先后顺序。",
      tool_calls: [
        {
          tool_call_id: "call_01_rg",
          function_name: "bash",
          arguments: {
            command:
              "rg -n \"webhook|payment_intent|signature\" src tests --glob '!node_modules'",
          },
          extra: { kind: "search" },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_01_rg",
            title: "rg · 18 matches",
            content:
              "src/http/routes.ts:34: app.post('/webhooks/stripe', paymentWebhook)\nsrc/webhooks/payment.ts:12: export async function paymentWebhook(req, res)\nsrc/webhooks/payment.ts:28: const event = await verifyAndParse(req)\nsrc/domain/payment-events.ts:41: async function recordEvent(eventId)\ntests/webhooks/payment.test.ts:18: describe('payment webhook', ...)",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:02:06.320Z",
              ended_at: "2026-11-26T14:02:06.508Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 5820,
        completion_tokens: 612,
        cached_tokens: 3072,
        cost_usd: 0.0196,
        extra: { latency_ms: 7420 },
      },
    },
    {
      step_id: 3,
      timestamp: "2026-11-26T14:02:15.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message: "",
      reasoning_content:
        "入口使用 express.json()，这会破坏 Stripe 签名所需的原始请求体。事件记录看起来是在业务处理后才写入，因此并发请求都可能通过检查。",
      tool_calls: [
        {
          tool_call_id: "call_02_read_payment",
          function_name: "read",
          arguments: { filePath: "src/webhooks/payment.ts" },
        },
        {
          tool_call_id: "call_03_read_events",
          function_name: "read",
          arguments: { filePath: "src/domain/payment-events.ts" },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_02_read_payment",
            title: "src/webhooks/payment.ts",
            content:
              "export async function paymentWebhook(req: Request, res: Response) {\n  const event = verifyAndParse(req.body, req.header('stripe-signature'))\n  const seen = await findPaymentEvent(event.id)\n  if (seen?.status === 'completed') return res.status(200).json({ received: true })\n\n  await chargeCustomer(event.data.object)\n  await recordEvent(event.id, 'completed')\n  return res.status(200).json({ received: true })\n}",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:02:15.140Z",
              ended_at: "2026-11-26T14:02:15.192Z",
            },
          },
          {
            source_call_id: "call_03_read_events",
            title: "src/domain/payment-events.ts",
            content:
              "export async function recordEvent(id: string, status: EventStatus) {\n  return db.paymentEvent.upsert({\n    where: { id },\n    create: { id, status },\n    update: { status },\n  })\n}",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:02:15.196Z",
              ended_at: "2026-11-26T14:02:15.221Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 7210,
        completion_tokens: 975,
        cached_tokens: 4096,
        cost_usd: 0.0268,
        extra: { latency_ms: 9810 },
      },
    },
    {
      step_id: 4,
      timestamp: "2026-11-26T14:02:27.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message:
        "问题已确认：原始 body 未被保留，且幂等占位发生在副作用之后。我会改为 raw body 验签，并以原子方式抢占事件 ID。",
      tool_calls: [
        {
          tool_call_id: "call_04_write",
          function_name: "write",
          arguments: {
            filePath: "src/webhooks/payment.ts",
            content:
              "const claimed = await claimPaymentEvent(event.id)\nif (!claimed) return res.status(200).json({ received: true })\n\ntry {\n  await chargeCustomer(event.data.object)\n  await completePaymentEvent(event.id)\n} catch (error) {\n  await releasePaymentEvent(event.id)\n  throw error\n}",
          },
          extra: { kind: "edit", additions: 28, deletions: 12 },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_04_write",
            title: "Updated payment.ts",
            content:
              "src/webhooks/payment.ts\n\n+ rawBodyParser({ type: 'application/json' })\n+ const claimed = await claimPaymentEvent(event.id)\n+ if (!claimed) return res.status(200).json({ received: true })\n+ await releasePaymentEvent(event.id)\n\n28 additions, 12 deletions",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:02:27.122Z",
              ended_at: "2026-11-26T14:02:27.161Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 8030,
        completion_tokens: 1188,
        cached_tokens: 4608,
        cost_usd: 0.0322,
        extra: { latency_ms: 11320 },
      },
    },
    {
      step_id: 5,
      timestamp: "2026-11-26T14:02:40.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message: "实现完成，先运行支付模块的类型检查与集成测试。",
      tool_calls: [
        {
          tool_call_id: "call_05_test",
          function_name: "bash",
          arguments: {
            command: "npm test -- tests/webhooks/payment.test.ts",
            timeout: 120000,
          },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_05_test",
            title: "Payment webhook tests · failed",
            content:
              "FAIL tests/webhooks/payment.test.ts\n  ✓ accepts a valid event (84 ms)\n  ✓ deduplicates completed events (41 ms)\n  ✕ supports concurrent duplicate delivery (39 ms)\n  ✕ releases claim after transient failure (28 ms)\n\nTypeError: Cannot read properties of undefined (reading 'id')\n  at claimPaymentEvent (src/domain/payment-events.ts:53:31)\n\nTests: 2 failed, 2 passed",
            extra: {
              status: "error",
              is_error: true,
              exit_code: 1,
              started_at: "2026-11-26T14:02:40.018Z",
              ended_at: "2026-11-26T14:02:43.781Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 9420,
        completion_tokens: 1425,
        cached_tokens: 5120,
        cost_usd: 0.0388,
        extra: { latency_ms: 12640 },
      },
    },
    {
      step_id: 6,
      timestamp: "2026-11-26T14:02:51.000Z",
      source: "system",
      message:
        "Test watcher detected 2 failures. Build remains available for 30 minutes; no deployment was triggered.",
      observation: {
        results: [
          {
            content: "exit code: 1 · duration: 3.76s · package: payments-api@2.14.0",
            extra: { status: "error", exit_code: 1, title: "Test runner" },
          },
        ],
      },
      extra: { event: "test_failed", severity: "warning" },
    },
    {
      step_id: 7,
      timestamp: "2026-11-26T14:02:56.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message:
        "失败点是测试夹具没有传入 event ID，同时释放占位的路径没有处理 not-found。我会修正夹具并让释放操作幂等。",
      tool_calls: [
        {
          tool_call_id: "call_06_patch",
          function_name: "apply_patch",
          arguments: {
            patch:
              "*** Begin Patch\n*** Update File: tests/webhooks/payment.test.ts\n-  await claimPaymentEvent()\n+  await claimPaymentEvent('evt_concurrent_001')\n*** Update File: src/domain/payment-events.ts\n-  await db.paymentEvent.delete({ where: { id } })\n+  await db.paymentEvent.deleteMany({ where: { id, status: 'processing' } })\n*** End Patch",
          },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_06_patch",
            title: "Patch applied",
            content:
              "Success. Updated the following files:\nM tests/webhooks/payment.test.ts\nM src/domain/payment-events.ts",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:02:56.240Z",
              ended_at: "2026-11-26T14:02:56.301Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 10680,
        completion_tokens: 1560,
        cached_tokens: 6144,
        cost_usd: 0.0416,
        extra: { latency_ms: 11840 },
      },
    },
    {
      step_id: 8,
      timestamp: "2026-11-26T14:03:09.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message:
        "修复已应用。我并行启动支付测试和一次独立代码审查，审查会关注是否还有竞态或签名绕过。",
      tool_calls: [
        {
          tool_call_id: "call_07_tests",
          function_name: "bash",
          arguments: { command: "npm test -- tests/webhooks", timeout: 120000 },
        },
        {
          tool_call_id: "call_08_subagent",
          function_name: "task",
          arguments: {
            subagent_type: "general-purpose",
            description: "Review payment webhook",
            prompt: "重点检查幂等竞态、raw body 验签和失败恢复。",
          },
          extra: { subagent: true },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_07_tests",
            title: "Payment webhook tests · passed",
            content:
              "PASS tests/webhooks/payment.test.ts\n  ✓ accepts a valid event (76 ms)\n  ✓ deduplicates completed events (39 ms)\n  ✓ supports concurrent duplicate delivery (44 ms)\n  ✓ releases claim after transient failure (31 ms)\n\nTest Suites: 1 passed\nTests: 4 passed, 4 total\nTime: 2.841 s",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:03:09.014Z",
              ended_at: "2026-11-26T14:03:11.855Z",
            },
          },
          {
            source_call_id: "call_08_subagent",
            title: "Subagent completed · 3 issues reviewed",
            content:
              "审查完成。已确认幂等占位顺序、raw-body 验签和失败释放路径正确。建议补充一条过期 processing 记录的恢复任务，已附在子轨迹中。",
            subagent_trajectory_ref: [
              {
                trajectory_id: "traj_demo_reviewer",
                session_id: "ses_demo_payments",
                extra: { label: "code-reviewer", status: "completed" },
              },
            ],
            extra: {
              status: "completed",
              started_at: "2026-11-26T14:03:09.027Z",
              ended_at: "2026-11-26T14:05:27.104Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 4120,
        completion_tokens: 930,
        cached_tokens: 3072,
        cost_usd: 0.0126,
        extra: { latency_ms: 14220 },
      },
    },
    {
      step_id: 9,
      timestamp: "2026-11-26T14:05:31.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message:
        "完整测试通过，独立审查也未发现阻断问题。我会再补一个过期占位恢复测试，然后汇总结果。",
      tool_calls: [
        {
          tool_call_id: "call_09_recovery_test",
          function_name: "bash",
          arguments: {
            command:
              "npm test -- tests/webhooks/payment.test.ts --testNamePattern='stale processing'",
          },
        },
      ],
      observation: {
        results: [
          {
            source_call_id: "call_09_recovery_test",
            title: "Stale processing recovery · passed",
            content:
              "PASS tests/webhooks/payment.test.ts\n  ✓ recovers stale processing events (26 ms)\n\nTests: 1 passed, 1 total",
            extra: {
              status: "completed",
              exit_code: 0,
              started_at: "2026-11-26T14:05:31.402Z",
              ended_at: "2026-11-26T14:05:33.105Z",
            },
          },
        ],
      },
      metrics: {
        prompt_tokens: 3440,
        completion_tokens: 410,
        cached_tokens: 2560,
        cost_usd: 0.0108,
        extra: { latency_ms: 8120 },
      },
    },
    {
      step_id: 10,
      timestamp: "2026-11-26T14:05:41.000Z",
      source: "agent",
      model_name: "gpt-5-codex",
      reasoning_effort: "high",
      llm_call_count: 1,
      message:
        "修复完成，共修改 3 个文件。现在 webhook 在业务副作用之前原子抢占事件 ID，使用原始请求体验证签名，失败时会释放占位；并发重复投递和过期记录恢复均有测试覆盖。\n\n验证结果：支付 webhook 相关测试 5/5 通过，独立子代理审查未发现阻断问题。",
      metrics: {
        prompt_tokens: 0,
        completion_tokens: 760,
        cached_tokens: 0,
        cost_usd: 0,
        extra: { latency_ms: 9400 },
      },
    },
  ],
  subagent_trajectories: [subagent],
};

export default demo;
