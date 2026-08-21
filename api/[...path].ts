import { createApp } from "../server/_core/app";

// Vercel's file-system function router maps every /api/* request to the
// existing Express application. The application keeps the /api prefix, so its
// tRPC, OAuth, storage, scheduled-task and health routes remain unchanged.
export default createApp();
