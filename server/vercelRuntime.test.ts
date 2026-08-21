import { describe, expect, it } from "vitest";
import { createApp } from "./_core/app";
import vercelApi from "./vercelApi";

describe("Vercel Express runtime", () => {
  it("builds an application that can be exported as a request handler", () => {
    const app = createApp();
    expect(typeof app).toBe("function");
    expect(typeof app.handle).toBe("function");
  });

  it("exports the same Express handler for the Vercel catch-all API bundle", () => {
    expect(typeof vercelApi).toBe("function");
    expect(typeof vercelApi.handle).toBe("function");
  });
});
