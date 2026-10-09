/**
 * Minimal typing of the Artifact runtime (contract 0.2.75) used by src/services.
 * Only the calls this site makes are declared. See docs/data-model.md.
 */
interface ArtifactDocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface ArtifactQuerySnapshot {
  docs: ArtifactDocSnapshot[];
  size: number;
  empty: boolean;
}
interface ArtifactQuery {
  orderBy(field: string, dir?: 'asc' | 'desc'): ArtifactQuery;
  limit(n: number): ArtifactQuery;
  get(): Promise<ArtifactQuerySnapshot>;
  onSnapshot(next: (s: ArtifactQuerySnapshot) => void, error?: (e: { code: string; message: string }) => void): () => void;
}
interface ArtifactCollection extends ArtifactQuery {
  doc(id?: string): ArtifactDoc;
}
interface ArtifactDoc {
  id: string;
  path: string;
  get(): Promise<ArtifactDocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  onSnapshot(next: (s: ArtifactDocSnapshot) => void, error?: (e: { code: string; message: string }) => void): () => void;
  collection(path: string): ArtifactCollection;
}
interface ArtifactDB {
  doc(path: string): ArtifactDoc;
  collection(path: string): ArtifactCollection;
}
interface ArtifactUser {
  isOwner(): Promise<boolean>;
  can(capability: string): Promise<boolean | null>;
  id(): Promise<string | null>;
}
interface ArtifactRuntime {
  use(name: 'db'): Promise<ArtifactDB | null>;
  use(name: 'user'): Promise<ArtifactUser | null>;
}
interface Window {
  claude?: ArtifactRuntime;
}
