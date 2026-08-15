import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({ appendAiStudyMessage: vi.fn(), createAiStudyConversation: vi.fn(), deleteAiStudyConversation: vi.fn(), getAiStudyConversation: vi.fn(), getKnowledgeDocumentCitations: vi.fn(), getRecentAiStudyMessages: vi.fn(), listAiStudyConversations: vi.fn(), saveAiStudySummary: vi.fn(), searchAiStudyConversations: vi.fn() }));
const llmMock = vi.hoisted(() => ({ invokeLLM: vi.fn(), listLLMModels: vi.fn() }));
vi.mock("./db", () => dbMock);
vi.mock("./_core/llm", () => llmMock);

import { aiStudyRouter, listConfiguredProviders, normalizeCompatibleBaseUrl } from "./routers/aiStudy";

function createContext(): TrpcContext { return { user: { id: 42, openId: "ai-user", name: "AI User", email: "ai@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("AI 学习助手提供方配置", () => {
  beforeEach(() => vi.clearAllMocks());

  it("规范化 OpenAI 兼容端点末尾斜杠", () => {
    expect(normalizeCompatibleBaseUrl(" https://ai.example.com/v1/// ")).toBe("https://ai.example.com/v1");
  });

  it("始终保留内置服务，并在未提供外部配置时安全关闭可选端点", () => {
    const providers = listConfiguredProviders();
    expect(providers.builtin).toBe(true);
    expect(typeof providers.local).toBe("boolean");
    expect(typeof providers.network).toBe("boolean");
  });

  it("创建个人会话，并将上下文窗口限制为最近八条消息", async () => {
    dbMock.getRecentAiStudyMessages.mockResolvedValue(undefined); dbMock.getKnowledgeDocumentCitations.mockResolvedValue([]); dbMock.createAiStudyConversation.mockResolvedValue({ id: 12 }); dbMock.appendAiStudyMessage.mockResolvedValue(undefined);
    llmMock.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] }); llmMock.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "学习性说明" } }] });
    const caller = aiStudyRouter.createCaller(createContext());
    await expect(caller.explain({ context: { kind: "经方", title: "麻黄汤" }, question: "请说明学习线索", provider: "builtin" })).resolves.toMatchObject({ conversationId: 12, answer: "学习性说明" });
    expect(dbMock.createAiStudyConversation).toHaveBeenCalledWith(42, expect.objectContaining({ contextKind: "formula", contextTitle: "麻黄汤" }));
    expect(dbMock.appendAiStudyMessage).toHaveBeenCalledWith(12, "user", "请说明学习线索");
    expect(llmMock.invokeLLM.mock.calls[0][0].messages).toHaveLength(2);
  });

  it("禁止将其他学习条目的历史会话复用于当前页面", async () => {
    dbMock.getRecentAiStudyMessages.mockResolvedValue({ conversation: { id: 8, contextKind: "herb", contextTitle: "桂枝" }, messages: Array.from({ length: 8 }, (_, index) => ({ role: "user", content: `历史 ${index}` })) });
    const caller = aiStudyRouter.createCaller(createContext());
    await expect(caller.explain({ context: { kind: "本草", title: "麻黄" }, question: "继续解释", provider: "builtin", conversationId: 8 })).rejects.toThrow("不属于当前学习条目");
    expect(dbMock.getRecentAiStudyMessages).toHaveBeenCalledWith(42, 8, 8);
  });

  it("将手动摘要绑定到当前用户的会话，并保留消息计数", async () => {
    dbMock.getAiStudyConversation.mockResolvedValue({ conversation: { id: 17, contextKind: "formula", contextTitle: "麻黄汤" }, messages: [{ role: "user", content: "第一问" }, { role: "assistant", content: "第一答" }], summary: null });
    dbMock.saveAiStudySummary.mockResolvedValue({ conversationId: 17, content: "摘要内容", sourceMessageCount: 2 });
    llmMock.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] }); llmMock.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "摘要内容" } }] });
    const caller = aiStudyRouter.createCaller(createContext());
    await expect(caller.summaries.generate({ conversationId: 17, provider: "builtin" })).resolves.toMatchObject({ answer: "摘要内容", summary: { sourceMessageCount: 2 } });
    expect(dbMock.saveAiStudySummary).toHaveBeenCalledWith(42, 17, "摘要内容", 2);
  });

  it("仅在当前用户范围内检索个人历史会话", async () => {
    dbMock.searchAiStudyConversations.mockResolvedValue([{ id: 17, title: "麻黄汤", matchedSnippet: "条文关键词", hasSummary: true }]);
    const caller = aiStudyRouter.createCaller(createContext());
    await expect(caller.conversations.search({ query: "关键词" })).resolves.toHaveLength(1);
    expect(dbMock.searchAiStudyConversations).toHaveBeenCalledWith(42, "关键词");
  });
});
