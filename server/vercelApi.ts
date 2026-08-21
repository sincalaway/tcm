import { createApp } from "./_core/app";

// Bundled by `pnpm vercel:build` into api/[...path].js so Vercel Functions do
// not depend on untraced TypeScript files at runtime.
export default createApp();
