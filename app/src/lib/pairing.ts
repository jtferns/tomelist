const TOKEN = /^[A-Za-z0-9_-]{22}$/;

// 128 random bits as unpadded base64url: 22 chars, matching the Worker's route.
export function generateSyncToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The token rides in the fragment, which browsers never send to the server.
export function pairingUrl(origin: string, token: string): string {
  return `${origin}/#sync=${token}`;
}

export function readPairingHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("sync");
  return token && TOKEN.test(token) ? token : null;
}

// Reads a #sync=<token> link once at startup and removes it from the address
// bar, so the token is not left in history or reused on reload.
export function takePairingLink(): string | null {
  const token = readPairingHash(location.hash);
  if (token) history.replaceState(history.state, "", location.pathname + location.search);
  return token;
}
