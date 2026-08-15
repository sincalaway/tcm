import { z } from "zod";
import { appendAiStudyMessage, createAiStudyConversation, deleteAiStudyConversation, getAiStudyConversation, getRecentAiStudyMessages, listAiStudyConversations } from "../db";
import { ENV } from "../_core/env";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

const contextSchema = z.object({
  kind: z.enum(["本草", "经方", "古籍章节"]),
  title: z.string().trim().min(1).max(255),
  sourceTitle: z.string().trim().max(255).optional(),
  excerpt: z.string().trim().max(3000).optional(),
  studyNote: z.string().trim().max(1600).optional(),
});

const providerSchema = z.enum(["auto", "builtin", "local", "network"]);
type Provider = z.infer<typeof providerSchema>;
type StudyMessage = { role: "system" | "user" | "assistant"; content: string };
type CompatibleConfig = { baseUrl: string; model: string; apiKey: string; label: "local" | "network" };

const assistantGuardrail = "你是中医古籍学习助手。仅依据用户提供的学习上下文，帮助梳理术语、文本结构、出处线索与可继续查阅的问题。不得做个体诊断、病情判断、治疗建议、处方、剂量或用药方案；遇到此类请求，简短说明本站只提供学习资料并建议咨询合格医疗专业人员。未知内容必须明确说明无法从给定资料确认。请使用简体中文、短段落和必要的项目符号，保持克制、可核查的语气。";
const toConversationKind = (kind: z.infer<typeof contextSchema>["kind"]) => kind === "本草" ? "herb" as const : kind === "经方" ? "formula" as const : "chapter" as const;

export function normalizeCompatibleBaseUrl(baseUrl: string) { return baseUrl.trim().replace(/\/+$/, ""); }

export function getCompatibleConfig(provider: "local" | "network"): CompatibleConfig | null {
  const raw = provider === "local"
    ? { baseUrl: ENV.localLlmBaseUrl, model: ENV.localLlmModel, apiKey: ENV.localLlmApiKey, label: "local" as const }
    : { baseUrl: ENV.networkLlmBaseUrl, model: ENV.networkLlmModel, apiKey: ENV.networkLlmApiKey, label: "network" as const };
  const baseUrl = normalizeCompatibleBaseUrl(raw.baseUrl);
  if (!baseUrl || !raw.model) return null;
  return { ...raw, baseUrl };
}

export function listConfiguredProviders() { return { builtin: true, local: Boolean(getCompatibleConfig("local")), network: Boolean(getCompatibleConfig("network")) }; }

async function callCompatibleApi(config: CompatibleConfig, messages: StudyMessage[]) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) }, body: JSON.stringify({ model: config.model, messages, max_tokens: 900, temperature: 0.2 }), signal: controller.signal });
    if (!response.ok) throw new Error(`${config.label} AI 服务返回 ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = payload.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error(`${config.label} AI 服务未返回学习内容`);
    return { answer, model: config.model, provider: config.label };
  } finally { clearTimeout(timeout); }
}

async function callBuiltin(messages: StudyMessage[]) {
  const { data } = await listLLMModels(); const model = data.find((candidate) => candidate.id === "gpt-5-mini")?.id ?? data[0]?.id;
  if (!model) throw new Error("当前没有可用的学习助手模型，请稍后再试。");
  const response = await invokeLLM({ model, maxTokens: 900, messages });
  const rawAnswer = response.choices[0]?.message.content; const answer = typeof rawAnswer === "string" ? rawAnswer.trim() : "";
  if (!answer) throw new Error("学习助手暂未返回内容，请稍后重试。");
  return { answer, model, provider: "builtin" as const };
}

async function explainWithProvider(provider: Provider, messages: StudyMessage[]) {
  const requested = provider === "auto" ? (["local", "network", "builtin"] as const) : [provider]; let lastError: unknown;
  for (const candidate of requested) {
    try { if (candidate === "builtin") return await callBuiltin(messages); const config = getCompatibleConfig(candidate); if (!config) continue; return await callCompatibleApi(config, messages); } catch (error) { lastError = error; if (provider !== "auto") throw error; }
  }
  throw lastError ?? new Error("当前没有可用的 AI 学习助手提供方。");
}

export const aiStudyRouter = router({
  providers: protectedProcedure.query(() => listConfiguredProviders()),
  conversations: router({
    list: protectedProcedure.input(z.object({ context: contextSchema.pick({ kind: true, title: true }).optional() }).optional()).query(({ ctx, input }) => input?.context ? listAiStudyConversations(ctx.user.id, { kind: toConversationKind(input.context.kind), title: input.context.title }) : listAiStudyConversations(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const result = await getAiStudyConversation(ctx.user.id, input.id); if (!result) throw new Error("对话不存在或无权访问"); return result;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAiStudyConversation(ctx.user.id, input.id)),
  }),
  explain: protectedProcedure.input(z.object({ context: contextSchema, question: z.string().trim().min(1).max(600), provider: providerSchema.default("auto"), conversationId: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
    const kind = toConversationKind(input.context.kind);
    const existing = input.conversationId ? await getRecentAiStudyMessages(ctx.user.id, input.conversationId, 8) : undefined;
    if (input.conversationId && !existing) throw new Error("对话不存在或无权访问");
    if (existing && (existing.conversation.contextKind !== kind || existing.conversation.contextTitle !== input.context.title)) throw new Error("该历史对话不属于当前学习条目");
    const conversationId = existing?.conversation.id ?? (await createAiStudyConversation(ctx.user.id, { title: input.context.title, contextKind: kind, contextTitle: input.context.title })).id;
    const history: StudyMessage[] = (existing?.messages ?? []).map((message) => ({ role: message.role, content: message.content.slice(0, 1800) }));
    const messages: StudyMessage[] = [
      { role: "system", content: `${assistantGuardrail}\n\n当前固定学习上下文：\n- 类型：${input.context.kind}\n- 标题：${input.context.title}\n- 来源：${input.context.sourceTitle ?? "未提供"}\n- 摘录：${input.context.excerpt ?? "未提供"}\n- 研读提示：${input.context.studyNote ?? "未提供"}\n\n仅将下列最近历史视为上下文；若历史未足以确认事实，请明确说明。` },
      ...history,
      { role: "user", content: input.question },
    ];
    const result = await explainWithProvider(input.provider, messages);
    await appendAiStudyMessage(conversationId, "user", input.question);
    await appendAiStudyMessage(conversationId, "assistant", result.answer);
    return { ...result, conversationId };
  }),
});
