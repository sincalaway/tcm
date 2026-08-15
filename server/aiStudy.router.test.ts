import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({ appendAiStudyMessage: vi.fn(), createAiStudyConversation: vi.fn(), deleteAiStudyConversation: vi.fn(), getAiStudyConversation: vi.fn(), getRecentAiStudyMessages: vi.fn(), listAiStudyConversations: vi.fn() }));
const llmMock = vi.hoisted(() => ({ invokeLLM: vi.fn(), listLLMModels: vi.fn() }));
vi.mock("./db", () => dbMock);
vi.mock("./_core/llm", () => llmMock);

import { aiStudyRouter, listConfiguredProviders, normalizeCompatibleBaseUrl } from "./routers/aiStudy";

function createContext(): TrpcContext { return { user: { id: 42, openId: "ai-user", name: "AI User", email: "ai@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("AI 学习助手提供方配置", () => {
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
    dbMock.getRecentAiStudyMessages.mockResolvedValue(undefined); dbMock.createAiStudyConversation.mockResolvedValue({ id: 12 }); dbMock.appendAiStudyMessage.mockResolvedValue(undefined);
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
});
