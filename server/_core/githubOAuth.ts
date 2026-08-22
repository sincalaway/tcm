export type GitHubProfile = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
};

export type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export function buildGitHubAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "read:user user:email");
  return url.toString();
}

export function normalizeGitHubUser(profile: GitHubProfile, emails: GitHubEmail[] = []) {
  const preferredEmail =
    profile.email ??
    emails.find((email) => email.primary && email.verified)?.email ??
    emails.find((email) => email.verified)?.email ??
    null;

  return {
    openId: `github:${profile.id}`,
    name: profile.name?.trim() || profile.login,
    email: preferredEmail,
    loginMethod: "github" as const,
  };
}
