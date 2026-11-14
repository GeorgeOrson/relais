import * as React from "react"

import { api } from "@/lib/api"
import type { Data } from "@/lib/relais"

// Données du serveur, rafraîchies toutes les 4 secondes quand l'onglet est visible :
// un livrable écrit par Claude fait passer l'étape à « À valider » sans recharger la page.
type Relais = {
  data: Data | null
  erreur: string | null
  rafraichir: () => Promise<void>
  reglages: Reglages
  regler: (r: Partial<Reglages>) => void
  nouveauProjet: (fluxId?: string) => void
  setNouveauProjet: (f: (fluxId?: string) => void) => void
}
type Reglages = { fond: boolean; masques: string[] }

const Ctx = React.createContext<Relais | null>(null)
const CLE = "relais-reglages"

function lisReglages(): Reglages {
  try {
    return { fond: true, masques: [], ...JSON.parse(localStorage.getItem(CLE) || "{}") }
  } catch {
    return { fond: true, masques: [] }
  }
}

export function RelaisProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<Data | null>(null)
  const [erreur, setErreur] = React.useState<string | null>(null)
  const [reglages, setReglages] = React.useState<Reglages>(lisReglages)
  const ouvreur = React.useRef<(fluxId?: string) => void>(() => {})

  const rafraichir = React.useCallback(async () => {
    try {
      setData(await api<Data>("/api/data"))
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }, [])

  React.useEffect(() => {
    rafraichir()
    const t = setInterval(() => {
      if (!document.hidden) rafraichir()
    }, 4000)
    const vu = () => {
      if (!document.hidden) rafraichir()
    }
    document.addEventListener("visibilitychange", vu)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", vu)
    }
  }, [rafraichir])

  const regler = React.useCallback((r: Partial<Reglages>) => {
    setReglages((v) => {
      const n = { ...v, ...r }
      try {
        localStorage.setItem(CLE, JSON.stringify(n))
      } catch {
        /* stockage indisponible : le réglage vaut pour cette visite */
      }
      return n
    })
  }, [])

  const valeur = React.useMemo<Relais>(
    () => ({
      data,
      erreur,
      rafraichir,
      reglages,
      regler,
      nouveauProjet: (id) => ouvreur.current(id),
      setNouveauProjet: (f) => {
        ouvreur.current = f
      },
    }),
    [data, erreur, rafraichir, reglages, regler]
  )
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useRelais() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("useRelais hors de RelaisProvider")
  return c
}
