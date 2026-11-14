import * as React from "react"

const mq = matchMedia("(prefers-reduced-motion: reduce)") // une seule requête pour toute l'application
const abonne = (f: () => void) => {
  mq.addEventListener("change", f)
  return () => mq.removeEventListener("change", f)
}

// Réglage « moins d'animations » du système, suivi en direct.
export const useCalme = () => React.useSyncExternalStore(abonne, () => mq.matches)
