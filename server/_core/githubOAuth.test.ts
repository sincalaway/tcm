import { describe, expect, it } from "vitest";
import { buildGitHubAuthorizeUrl, normalizeGitHubUser } from "./githubOAuth";

describe("GitHub OAuth helpers", () => {
  it("builds an authorization URL with a fixed least-privilege profile scope", () => {
    const url = new URL(
      buildGitHubAuthorizeUrl({
        clientId: "client-id",
        redirectUri: "https://preview.example.com/api/oauth/callback",
        state: "csrf-state",
      })
    );

    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("https://preview.example.com/api/oauth/callback");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("scope")).toBe("read:user user:email");
  });

  it("uses a stable provider-prefixed identity and a verified private email", () => {
    expect(
      normalizeGitHubUser(
        { id: 42, login: "songke-reader", name: null, email: null },
        [
          { email: "unverified@example.com", primary: true, verified: false },
          { email: "reader@example.com", primary: false, verified: true },
        ]
      )
    ).toEqual({
      openId: "github:42",
      name: "songke-reader",
      email: "reader@example.com",
      loginMethod: "github",
    });
  });
});
