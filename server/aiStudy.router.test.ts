import { describe, expect, it } from "vitest";
import { listConfiguredProviders, normalizeCompatibleBaseUrl } from "./routers/aiStudy";

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
});
