import { createHash } from "node:crypto";

/**
 * Canonical SHA-256 of a gallery set's contentHashes. Order-independent so
 * reshuffling the images doesn't produce a different `imagesHash` (and thus
 * a different "identical set" judgment for the unique constraint).
 */
export function computeSetHash(contentHashes: string[]): string {
  return createHash("sha256")
    .update([...contentHashes].sort().join(""))
    .digest("hex");
}
