import { createApp } from "./server/_core/app";

// Vercel detects a root-level Express default export and runs it as one Node.js
// function. Public assets are emitted into public/** by vite.config.ts.
export default createApp();
