// biome-ignore lint/style/noRestrictedImports: this is the wrapper itself
import { type EffectCallback, useEffect } from "react";

export const useMountEffect = (callback: EffectCallback) =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  useEffect(callback, []);
