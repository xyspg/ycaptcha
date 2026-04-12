// biome-ignore lint/style/noRestrictedImports: this is the wrapper itself
import { type EffectCallback, useEffect } from "react";

export const useMountEffect = (callback: EffectCallback) =>
  useEffect(callback, []);
