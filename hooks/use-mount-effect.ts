// biome-ignore lint/style/noRestrictedImports: this is the wrapper itself
import { useEffect } from "react";

export const useMountEffect = (callback: () => undefined | (() => void)) =>
	useEffect(callback, []);
