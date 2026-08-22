import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Starts GitHub OAuth from a user action. The nonce cookie binds the callback
// to the initiating browser and the server validates the redirect origin.
export const startLogin = () => {
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL("/api/oauth/github", window.location.origin);
  url.searchParams.set("state", state);
  window.location.href = url.toString();
};
