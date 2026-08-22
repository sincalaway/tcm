import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { buildGitHubAuthorizeUrl, normalizeGitHubUser, type GitHubEmail, type GitHubProfile } from "./githubOAuth";
import { sdk } from "./sdk";

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_PROFILE_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRequestOrigin(req: Request): string | null {
  const protocolHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"];
  const protocol = (typeof protocolHeader === "string" ? protocolHeader : req.protocol || "https").split(",")[0]?.trim();
  const host = (typeof hostHeader === "string" ? hostHeader : req.get("host") ?? "").split(",")[0]?.trim();
  if (!protocol || !host) return null;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function callbackUrlFor(req: Request): string | null {
  const origin = getRequestOrigin(req);
  return origin ? `${origin}/api/oauth/callback` : null;
}

function hasValidStateNonce(req: Request, state: string): boolean {
  const { nonce } = decodeOAuthState(state);
  const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
  return Boolean(nonce && nonce === expectedNonce);
}

function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

async function exchangeGitHubCode(code: string, redirectUri: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? "",
    client_secret: process.env.GITHUB_CLIENT_SECRET ?? "",
    code,
    redirect_uri: redirectUri,
  });
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("GitHub token exchange failed");

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("GitHub token response missing access token");
  return payload.access_token;
}

async function getGitHubUser(accessToken: string) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const profileResponse = await fetch(GITHUB_PROFILE_URL, { headers });
  if (!profileResponse.ok) throw new Error("GitHub profile request failed");
  const profile = (await profileResponse.json()) as GitHubProfile;

  const emailsResponse = await fetch(GITHUB_EMAILS_URL, { headers });
  const emails = emailsResponse.ok ? ((await emailsResponse.json()) as GitHubEmail[]) : [];
  return normalizeGitHubUser(profile, emails);
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/github", (req: Request, res: Response) => {
    const state = getQueryParam(req, "state");
    const callbackUrl = callbackUrlFor(req);
    const expectedRedirectUri = state ? decodeOAuthState(state).redirectUri : "";

    if (!githubConfigured()) {
      res.status(503).json({ error: "GitHub OAuth is not configured" });
      return;
    }
    if (!state || !callbackUrl || expectedRedirectUri !== callbackUrl || !hasValidStateNonce(req, state)) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }

    res.redirect(302, buildGitHubAuthorizeUrl({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      redirectUri: callbackUrl,
      state,
    }));
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const callbackUrl = callbackUrlFor(req);
    const expectedRedirectUri = state ? decodeOAuthState(state).redirectUri : "";

    if (!githubConfigured()) {
      res.status(503).json({ error: "GitHub OAuth is not configured" });
      return;
    }
    if (!code || !state || !callbackUrl || expectedRedirectUri !== callbackUrl || !hasValidStateNonce(req, state)) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    try {
      const accessToken = await exchangeGitHubCode(code, callbackUrl);
      const userInfo = await getGitHubUser(accessToken);
      await db.upsertUser({ ...userInfo, lastSignedIn: new Date() });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name,
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/");
    } catch {
      console.warn("[OAuth] GitHub callback failed");
      res.status(500).json({ error: "GitHub OAuth callback failed" });
    }
  });
}
