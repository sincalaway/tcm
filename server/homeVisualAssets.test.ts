import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");

describe("homepage visual assets", () => {
  it("uses a Vercel-buildable static visual rather than a Manus-only path", () => {
    expect(homeSource).not.toContain('"/manus-storage/');
    expect(homeSource).toContain('"/images/tcm-hero-song-study.webp"');
    expect(existsSync(resolve(projectRoot, "client/public/images/tcm-hero-song-study.webp"))).toBe(true);
  });
});
