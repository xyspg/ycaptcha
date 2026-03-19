// eslint-disable-next-line no-restricted-imports
import { useEffect } from "react"

// eslint-disable-next-line react-hooks/exhaustive-deps
export const useMountEffect = (callback: () => void | (() => void)) => useEffect(callback, [])
