import * as React from "react"

const mq = () => matchMedia("(prefers-reduced-motion: reduce)")
const abonne = (f: () => void) => {
  const m = mq()
  m.addEventListener("change", f)
  return () => m.removeEventListener("change", f)
}

// Réglage « moins d'animations » du système, suivi en direct.
export const useCalme = () => React.useSyncExternalStore(abonne, () => mq().matches)
