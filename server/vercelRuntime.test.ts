import { describe, expect, it } from "vitest";
import { createApp } from "./_core/app";

describe("Vercel Express runtime", () => {
  it("builds an application that can be exported as a request handler", () => {
    const app = createApp();
    expect(typeof app).toBe("function");
    expect(typeof app.handle).toBe("function");
  });
});
