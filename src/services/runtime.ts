/**
 * Access to the Artifact runtime. Outside claude.ai (local dev, previews) `window.claude`
 * is absent and every capability resolves to null, which the UI treats as "offline".
 */
let db: Promise<ArtifactDB | null> | undefined;
let user: Promise<ArtifactUser | null> | undefined;

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

export function getDb(): Promise<ArtifactDB | null> {
  db ??= window.claude ? withTimeout(window.claude.use('db').catch(() => null), 10_000, null) : Promise.resolve(null);
  return db;
}

export function getUser(): Promise<ArtifactUser | null> {
  user ??= window.claude ? withTimeout(window.claude.use('user').catch(() => null), 10_000, null) : Promise.resolve(null);
  return user;
}
