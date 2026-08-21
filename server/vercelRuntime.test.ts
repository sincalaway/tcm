import { describe, expect, it } from "vitest";
import { createApp } from "./_core/app";
import vercelApi from "../api/[...path]";

describe("Vercel Express runtime", () => {
  it("builds an application that can be exported as a request handler", () => {
    const app = createApp();
    expect(typeof app).toBe("function");
    expect(typeof app.handle).toBe("function");
  });

  it("exports the same Express handler through the Vercel catch-all API entry", () => {
    expect(typeof vercelApi).toBe("function");
    expect(typeof vercelApi.handle).toBe("function");
  });
});
