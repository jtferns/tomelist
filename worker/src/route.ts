// A sync token is 16 random bytes in base64url without padding: 22 chars.
const SYNC_PATH = /^\/api\/sync\/([A-Za-z0-9_-]{22})$/;

export type ApiRoute = { kind: "sync"; token: string } | { kind: "not-found" };

export function routeApi(pathname: string): ApiRoute {
  const match = SYNC_PATH.exec(pathname);
  return match ? { kind: "sync", token: match[1] } : { kind: "not-found" };
}
